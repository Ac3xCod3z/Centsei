
import Image from 'next/image';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="bg-background min-h-screen">
      <header className="py-4 px-4 md:px-6 border-b">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Image src="/CentseiLogo.png" alt="Centsei Logo" width={80} height={26} />
        </Link>
      </header>
      <main className="max-w-4xl mx-auto py-12 px-4 md:px-6">
        <div className="space-y-8 text-foreground">
          <h1 className="text-4xl font-bold">Terms of Service for Centsei</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Centsei ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p>
              The Service is a personal budgeting application that allows users to track their income and expenses. The data you enter is stored in your web browser's local storage and is not transmitted to our servers.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Responsibilities</h2>
            <p>
              You are responsible for your use of the Service and for any data you enter. You are responsible for safeguarding your own device and data. We are not responsible for any loss of data from your local device.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Disclaimer of Warranties</h2>
            <p>
              The service is provided "as is" and "as available" without any warranties of any kind, including that the service will be uninterrupted or error-free. We disclaim all warranties, whether express or implied, including the warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </div>

           <div className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Limitation of Liability</h2>
            <p>
              In no event shall Centsei be liable for any direct, indirect, incidental, special, consequential or exemplary damages, including but not to, damages for loss of profits, goodwill, use, data or other intangible losses resulting from the use of or inability to use the service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Modification of Terms</h2>
            <p>
              We reserve the right to change these terms from time to time as we see fit. Your continued use of the site will signify your acceptance of any adjustment to these terms. You are therefore advised to re-read this statement on a regular basis.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p>
                If you have any questions about these Terms of Service, you can contact us through the support channels provided by Firebase Studio.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

    