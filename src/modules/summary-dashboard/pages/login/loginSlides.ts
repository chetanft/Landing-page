/**
 * Product showcase slides configuration for login page
 */
export interface ProductSlide {
  title: string
  description: string
  image: string
  cardGradient: string
  textGradient: string
}

// Main product image for slides
const imgImage5 = '/assets/product-showcase.png'

export const productSlides: ProductSlide[] = [
  {
    title: 'FT Cargo : Part Truck Load TMS',
    description: 'Effortlessly track your PTL and cargo shipments across multiple courier partners. Get real-time updates, manage dispatches, and streamline your logistics with ease.',
    image: imgImage5,
    cardGradient: 'linear-gradient(135deg, var(--bg-primary) 0%, #F3F8FF 100%)',
    textGradient: 'linear-gradient(90deg, var(--primary) 0%, #3B82F6 100%)'
  },
  {
    title: 'FT FTL : Full Truck Load TMS',
    description: 'Seamlessly monitor and manage your full truckload shipments. Gain complete visibility, optimize deliveries, and enhance operational efficiency with an integrated tracking system.',
    image: imgImage5,
    cardGradient: 'linear-gradient(135deg, #F0FFF4 0%, #DCFCE7 100%)',
    textGradient: 'linear-gradient(90deg, #059669 0%, #10B981 100%)'
  },
  {
    title: 'FT Analytics : Smart Insights',
    description: 'Leverage powerful analytics to gain actionable insights. Monitor performance metrics, identify bottlenecks, and make data-driven decisions for your logistics operations.',
    image: imgImage5,
    cardGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
    textGradient: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)'
  },
  {
    title: 'FT Visibility : Live Tracking',
    description: 'Track your shipments in real-time with our advanced GPS integration. Get instant alerts on delays, route deviations, and ETA changes to keep your customers informed.',
    image: imgImage5,
    cardGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    textGradient: 'linear-gradient(90deg, #4F46E5 0%, #6366F1 100%)'
  },
  {
    title: 'FT Control Tower : Centralized Management',
    description: 'Take control of your entire logistics network from a single dashboard. Manage carriers, monitor costs, and optimize performance across all your business units efficiently.',
    image: imgImage5,
    cardGradient: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
    textGradient: 'linear-gradient(90deg, #DB2777 0%, #EC4899 100%)'
  }
]
