import Header from '@/components/site-vitrine/Header'
import Footer from '@/components/site-vitrine/Footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
