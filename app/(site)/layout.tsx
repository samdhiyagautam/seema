import { getSiteContent } from "@/lib/data";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <>
      <Header studioName={content.studio_name} phone={content.phone} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer content={content} />
      <WhatsAppFloat whatsapp={content.whatsapp_number} studioName={content.studio_name} />
    </>
  );
}
