export type SampleProduct = {
  id: string;
  productName: string;
  originalPrice: number;
  originalImage: string;
  stolenMatch: {
    platform: string;
    listingTitle: string;
    image: string;
    price: number;
    confidence: number;
    seller: string;
    listingUrl: string;
    detectedAt: string;
  };
  status: 'high-risk' | 'review';
};

export const sampleProducts: SampleProduct[] = [
  {
    id: 'VERA-001',
    productName: 'Hand-Painted Blue Ceramic Mug',
    originalPrice: 899,
    originalImage: '/products/ceramic-mug.jpg',
    stolenMatch: {
      platform: 'Meesho',
      listingTitle: 'Blue Handmade Ceramic Coffee Mug',
      image: '/mock-matches/meesho-mug.jpg',
      price: 399,
      confidence: 97,
      seller: 'HomeDecor_Store',
      listingUrl: '#',
      detectedAt: '2 hours ago',
    },
    status: 'high-risk',
  },
  {
    id: 'VERA-002',
    productName: 'Macramé Wall Hanging',
    originalPrice: 1499,
    originalImage: '/products/macrame-wall-hanging.jpg',
    stolenMatch: {
      platform: 'Etsy',
      listingTitle: 'Boho Macrame Wall Decor Handmade',
      image: '/mock-matches/etsy-macrame.jpg',
      price: 799,
      confidence: 94,
      seller: 'DecorNestShop',
      listingUrl: '#',
      detectedAt: '5 hours ago',
    },
    status: 'high-risk',
  },
  {
    id: 'VERA-003',
    productName: 'Floral Soy Wax Candle',
    originalPrice: 699,
    originalImage: '/products/floral-candle.jpg',
    stolenMatch: {
      platform: 'Instagram',
      listingTitle: 'Aesthetic Floral Candle',
      image: '/mock-matches/instagram-candle.jpg',
      price: 349,
      confidence: 91,
      seller: '@homevibes_india',
      listingUrl: '#',
      detectedAt: 'Yesterday',
    },
    status: 'high-risk',
  },
  {
    id: 'VERA-004',
    productName: 'Resin Pressed-Flower Tray',
    originalPrice: 1299,
    originalImage: '/products/resin-tray.jpg',
    stolenMatch: {
      platform: 'Meesho',
      listingTitle: 'Transparent Floral Resin Serving Tray',
      image: '/mock-matches/meesho-tray.jpg',
      price: 599,
      confidence: 88,
      seller: 'CraftyHomeIndia',
      listingUrl: '#',
      detectedAt: 'Yesterday',
    },
    status: 'review',
  },
];