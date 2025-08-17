
import Image from 'next/image';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background min-h-screen">
      <header className="py-4 px-4 md:px-6 border-b">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
        </Link>
      </header>
      <main className="max-w-4xl mx-auto py-12 px-4 md:px-6">
        <div className="space-y-8 text-foreground">
          <h1 className="text-4xl font-bold">Privacy Policy for Centsei</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Introduction</h2>
            <p>
              Welcome to Centsei ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application. By using Centsei, you agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Information We Collect</h2>
            <p>
              Centsei is designed to be privacy-focused. Your financial data is primarily stored on your own device.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Locally Stored Data:</strong> All financial entries (bills, income, etc.) that you create are stored exclusively in your browser's local storage. We do not have a server, and we do not see, collect, or store this data. It remains on your computer or device.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
            <p>
              We use the information we access for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain the core functionality of the Centsei application.</li>
              <li>To enable AI-powered features within the app, which process your input to provide recommendations. This data is not stored long-term.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Data Storage and Security</h2>
            <p>
              Your personal financial data is stored on your device's local storage and is not transmitted to us. We recommend using a secure device and browser to protect your local data.
            </p>
          </div>
          
           <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>
                If you have any questions about this Privacy Policy, you can contact us through the support channels provided by Firebase Studio.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

    