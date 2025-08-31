export async function getAuthFromRequest(req: Request): Promise<{ uid: string; email?: string } | null> {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null;
    const token = auth.slice(7);
    const { verifyIdToken } = await import('./firebase-admin');
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, email: (decoded as any).email };
  } catch {
    return null;
  }
}

