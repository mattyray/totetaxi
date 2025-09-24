// frontend/src/app/terms/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-navy-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-navy-600">
            Effective Date: January 2024 • Last Updated: January 2024
          </p>
        </div>

        <Card variant="elevated">
          <CardContent className="space-y-6 text-navy-700">
            
            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">General Terms</h2>
              <p className="mb-4">
                <strong>PLEASE READ THESE TERMS AND CONDITIONS (THE "TERMS AND CONDITIONS") CAREFULLY.</strong> 
                By using Tote Taxi and/or the Tote Taxi Website, you are agreeing to be bound by these Terms and Conditions. 
                If you do not agree to the Terms and Conditions, do not use Tote Taxi's services or the Tote Taxi Website.
              </p>
              
              <p className="mb-4">
                Tote Taxi LLC ("Tote Taxi") may revise and update these Terms and Conditions at any time without notice. 
                Your continued usage of the Tote Taxi Website after any such change or update will mean you accept those changes or updates.
              </p>
              
              <p className="mb-4">
                Any aspect of the Tote Taxi Website may be changed, supplemented, deleted or updated without notice at the sole discretion of Tote Taxi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Service Limitations</h2>
              <p className="mb-4">
                <strong>Tote Taxi will not accept for transport luggage or packages in excess of $150.00 in value.</strong> 
                Tote Taxi's inadvertent acceptance of any luggage or package in excess of $150.00 shall not negate 
                Tote Taxi's limitation of liability stated herein.
              </p>
              
              <p className="mb-4">
                By delivering luggage or package to, or causing luggage or package to be delivered to, Tote Taxi for transport, 
                you represent that the luggage or package does not contain any illegal substances, any liquids, or any hazardous materials, 
                and does not exceed $150.00 in value.
              </p>
              
              <p className="mb-4">
                Tote Taxi reserves the right to reject any luggage or packages that are damaged or are improperly packed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Limitation of Liability</h2>
              <p className="mb-4">
                TO THE EXTENT NOT PROHIBITED BY APPLICABLE LAW, IN NO EVENT SHALL TOTE TAXI BE LIABLE FOR PERSONAL INJURY, 
                OR ANY INCIDENTAL, SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES WHATSOEVER, REGARDLESS OF THE THEORY OF LIABILITY 
                (CONTRACT, TORT OR OTHERWISE) EVEN IF Tote Taxi HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              
              <p className="mb-4">
                In no event shall Tote Taxi's total liability to you for all damages (other than as may be required by applicable law 
                in cases involving personal injury) exceed $150.00.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Intellectual Property</h2>
              <p className="mb-4">
                Any and all intellectual property rights associated with Tote Taxi and with the Tote Taxi Website and its contents 
                are the sole property of Tote Taxi, its affiliates or third parties.
              </p>
              
              <p className="mb-4">
                The Tote Taxi Website is protected by copyright and other laws in both the United States and other countries. 
                Elements of the Tote Taxi Website are also protected by trade dress, trade secret, unfair competition, 
                and other laws and may not be copied or imitated in whole or in part.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Privacy</h2>
              <p className="mb-4">
                At all times your information will be treated in accordance with Tote Taxi's Privacy Policy, 
                which is incorporated by reference into these Terms and Conditions.
              </p>
              
              <p className="mb-4">
                You agree that Tote Taxi and its agents may collect, maintain, process and use diagnostic, technical, 
                usage and related information, that is gathered periodically to facilitate the provision of updates, 
                product support and other services to you related to Tote Taxi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Governing Law</h2>
              <p className="mb-4">
                Regardless of its place of negotiation, execution, or performance, you agree that these Terms and Conditions 
                are governed by and shall be construed in accordance with the internal substantive laws of the State of New York.
              </p>
              
              <p className="mb-4">
                Each party agrees to the exclusive jurisdiction of the state and federal courts in and for Suffolk County, 
                New York for any litigation or other dispute resolution relating in any way to these Terms and Conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-navy-900 mb-3">Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-cream-50 p-4 rounded-lg">
                <p className="font-medium text-navy-900">Tote Taxi LLC</p>
                <p>Email: legal@totetaxi.com</p>
                <p>Phone: (555) TOTE-TAXI</p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}