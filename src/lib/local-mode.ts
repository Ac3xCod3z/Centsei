
export const isLocalMode = () =>
  typeof window !== 'undefined' && localStorage.getItem('centseiAuthMode') === 'local';

export const enableLocalMode = () => {
  if (typeof window !== 'undefined') localStorage.setItem('centseiAuthMode', 'local');
};

export const disableLocalMode = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('centseiAuthMode');
};
