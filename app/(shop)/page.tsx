"use client"

import PageTransition from "@/components/PageTransition";

import React from 'react'
import { useRouter } from "next/navigation"
import Link from "next/link"
import Slider from 'react-slick'
import { ArrowRight, Truck, ShieldCheck, Clock } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

import { useGetProductsQuery } from '@/features/products/productApi'
import ProductCard from '@/features/products/ProductCard'
import { Button } from '@/components/ui/button'
import FeaturedReviews from '@/components/FeaturedReviews'
import { useAppSelector } from '@/store/hooks'

import home from '@/assets/women.jpg'
import grocery from '@/assets/grocery.jpg'
import phone from '@/assets/phone.jpg'
import delivery from '@/assets/delivery.jpg'
import headphone from '@/assets/headphone.jpg'
import hoodie from '@/assets/hoodie.jpg'
import shopping from '@/assets/shopping.jpg'
import type { StaticImageData } from 'next/image'

function PageContent() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [isMobile, setIsMobile] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(media.matches)
    sync()
    if (media.addEventListener) {
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const reduceMotion = prefersReducedMotion || isMobile
  const audioUnlockedRef = React.useRef(false)

  React.useEffect(() => {
    const unlock = () => {
      audioUnlockedRef.current = true
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('pointerdown', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  const playHoverChime = React.useCallback((frequency = 520) => {
    if (!audioUnlockedRef.current || reduceMotion) return
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      gain.gain.value = 0.02
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
      osc.onended = () => ctx.close()
    } catch {
      // ignore
    }
  }, [reduceMotion])

  // --- Animation Variants (lighter on mobile) ---
  const staggerContainer = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduceMotion ? 0.05 : 0.15 }
    }
  }), [reduceMotion])

  const fadeUp = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0, y: reduceMotion ? 0 : 30 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] } }
  }), [reduceMotion])

  const scaleIn = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.9 },
    show: { opacity: 1, scale: 1, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: [0.16, 1, 0.3, 1] } }
  }), [reduceMotion])

  const slideInLeft = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0, x: reduceMotion ? 0 : -50 },
    show: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] } }
  }), [reduceMotion])

  const slideInRight = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0, x: reduceMotion ? 0 : 50 },
    show: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] } }
  }), [reduceMotion])
  const cardReveal = React.useMemo<Variants>(() => ({
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0.15 : 0.45, delay: reduceMotion ? 0 : i * 0.08, ease: [0.16, 1, 0.3, 1] }
    })
  }), [reduceMotion])

  const motionViewport = reduceMotion ? { once: true, amount: 0.2 } : { once: true, margin: "-100px" }
  const user = useAppSelector((state) => state.auth.user)
  const [stableFeaturedProducts, setStableFeaturedProducts] = React.useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const cached = JSON.parse(localStorage.getItem('homeFeaturedProducts') || '[]')
      return Array.isArray(cached) ? cached : []
    } catch {
      return []
    }
  })
  const [personalizedProducts, setPersonalizedProducts] = React.useState([])
  const {
    data: featuredData,
    isLoading: isFeaturedLoading,
    isFetching: isFeaturedFetching,
    isError: isFeaturedError,
    refetch: refetchFeatured
  } = useGetProductsQuery({ page: 1, limit: 12, featured: true, sortBy: 'newest' }, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  })

  const featuredProductsRaw = (featuredData as { products?: unknown[] } | undefined)?.products
  const featuredProductsList = Array.isArray(featuredProductsRaw) ? featuredProductsRaw : []

  const shouldFetchFallback =
    !isFeaturedLoading &&
    !isFeaturedFetching &&
    (isFeaturedError || featuredProductsList.length === 0)

  const {
    data: fallbackData,
    isLoading: isFallbackLoading,
    isFetching: isFallbackFetching,
    isError: isFallbackError,
    refetch: refetchFallback
  } = useGetProductsQuery(
    { page: 1, limit: 12, sortBy: 'newest' },
    {
      skip: !shouldFetchFallback,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  )

  const fallbackProductsRaw = (fallbackData as { products?: unknown[] } | undefined)?.products
  const fallbackProductsList = Array.isArray(fallbackProductsRaw) ? fallbackProductsRaw : []

  const featuredProducts = featuredProductsList.length > 0
    ? featuredProductsList
    : fallbackProductsList

  React.useEffect(() => {
    if (featuredProducts.length > 0) {
      setStableFeaturedProducts(featuredProducts)
      if (mounted) {
        localStorage.setItem('homeFeaturedProducts', JSON.stringify(featuredProducts))
      }
    }
  }, [featuredProducts, mounted])

  React.useEffect(() => {
    if (!mounted) return
    try {
      const cached = JSON.parse(localStorage.getItem('recentlyViewedProducts') || '[]')
      const list = Array.isArray(cached) ? cached.slice(0, 4) : []
      setPersonalizedProducts(list)
    } catch {
      setPersonalizedProducts([])
    }
  }, [mounted])

  const displayedFeaturedProducts =
    featuredProducts.length > 0
      ? featuredProducts
      : stableFeaturedProducts

  const isLoading = isFeaturedLoading || (shouldFetchFallback && isFallbackLoading)
  const isFetching = isFeaturedFetching || (shouldFetchFallback && isFallbackFetching)
  const isError = shouldFetchFallback ? isFallbackError : false
  const showSkeleton = (isLoading || isFetching) && displayedFeaturedProducts.length === 0

  const handleRefetch = () => {
    refetchFeatured()
    if (shouldFetchFallback) refetchFallback()
  }

  const slides: { id: number; image: string | StaticImageData; title: string; description: string; link: string }[] = [
    {
      id: 1,
      image: phone,
      title: 'Next-Gen Electronics',
      description: 'Discover the latest technology designed to elevate your everyday life.',
      link: '/products?category=electronics',
    },
    {
      id: 2,
      image: home,
      title: 'Elevate Your Style',
      description: 'Explore curated fashion pieces that make a statement wherever you go.',
      link: '/products?category=clothing',
    },
    {
      id: 3,
      image: grocery,
      title: 'Freshness Delivered',
      description: 'Premium quality groceries brought straight to your doorstep.',
      link: '/products?category=groceries',
    },
  ]

  const resolveImageSrc = React.useCallback((image: string | StaticImageData) => {
    return typeof image === 'string' ? image : image.src
  }, [])

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 1200,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    cssEase: 'ease-in-out',
    pauseOnHover: false,
    waitForAnimate: true,
  }

  return (
    <div className="w-full">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-slate-950">
        <Slider {...sliderSettings} className="h-[60vh] md:h-[90vh] w-full">
          {slides.map(slide => (
            <div key={slide.id} className="relative h-[60vh] md:h-[90vh] w-full outline-none">
              <img
                src={resolveImageSrc(slide.image)}
                className="absolute inset-0 h-full w-full object-cover transform scale-105 transition-transform duration-[1200ms] ease-out"
                alt={slide.title}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              <div className="absolute inset-0 flex flex-col items-start justify-center text-white p-8 md:p-24">
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: reduceMotion ? 0.2 : 0.5 }}
                  variants={staggerContainer}
                  className="max-w-2xl"
                >
                  <motion.span variants={fadeUp} className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-white/70 mb-4 block">
                    Limited Edition
                  </motion.span>
                  <motion.h1 variants={fadeUp} className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none font-display">
                    {slide.title.split(' ').map((word, i) => (
                      <span key={i} className={i === 1 ? 'text-gray-400 block' : 'block'}>{word}</span>
                    ))}
                  </motion.h1>
                  <motion.p variants={fadeUp} className="text-sm md:text-lg text-gray-300 mb-10 max-w-lg leading-relaxed font-medium">
                    {slide.description}
                  </motion.p>
                  <motion.div variants={fadeUp}>
                    <Button
                      size="lg"
                      className="bg-white text-black hover:bg-black hover:text-white transition-all duration-500 rounded-none px-12 py-7 text-sm font-bold uppercase tracking-widest"
                      onClick={() => router.push(slide.link)}
                    >
                      Shop Now
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          ))}
        </Slider>
      </section>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 mt-10">

        {/* EDITORIAL COLLECTIONS */}
        <section className="pt-10 pb-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={motionViewport}
            variants={fadeUp}
            className="flex justify-between items-end mb-8"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Collections</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-display">Editorial Picks</h2>
              <p className="text-sm text-gray-500 mt-2">Curated drops with a distinct point of view.</p>
            </div>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Urban Essentials', subtitle: 'Minimal, monochrome, elevated', image: home, link: '/products?category=clothing' },
              { title: 'Tech Forward', subtitle: 'New arrivals in electronics', image: phone, link: '/products?category=electronics' },
              { title: 'Fresh Market', subtitle: 'Groceries with premium quality', image: grocery, link: '/products?category=groceries' },
            ].map((card) => (
              <motion.div key={card.title} variants={fadeUp}>
                <div
                  onClick={() => router.push(card.link)}
                  className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm cursor-pointer"
                >
                  <img
                    src={typeof card.image === 'string' ? card.image : card.image.src}
                    alt={card.title}
                    className="h-64 w-full object-contain bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6 transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Collection</p>
                    <h3 className="text-2xl font-bold mt-2">{card.title}</h3>
                    <p className="text-sm text-white/80 mt-1">{card.subtitle}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                      Explore <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PERSONALIZED PICKS */}
        {(user || personalizedProducts.length > 0) && (
          <section className="mt-10">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={motionViewport}
              variants={fadeUp}
              className="flex justify-between items-end mb-8"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">For You</p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-display">
                  {user ? `Welcome back, ${user.name?.split(' ')[0] || 'Shopper'}` : 'Your Picks'}
                </h2>
                <p className="text-sm text-gray-500 mt-2">Hand-picked based on what you viewed recently.</p>
              </div>
              <Button variant="ghost" className="hidden md:flex font-semibold" onClick={() => router.push('/products')}>
                Browse All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {(personalizedProducts.length > 0 ? personalizedProducts : displayedFeaturedProducts.slice(0, 4)).map((product) => (
                <motion.div key={product._id} variants={fadeUp} className="h-full">
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURED PRODUCTS */}
        <section>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={motionViewport}
            variants={fadeUp}
            className="flex justify-between items-end mb-10"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-display">Featured Products</h2>
              <div className="h-1 w-20 bg-black mt-4 rounded-full"></div>
            </div>
            <Button variant="ghost" className="hidden md:flex font-semibold" onClick={() => router.push('/products')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={reduceMotion ? { once: true, amount: 0.2 } : { once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
          >
            {showSkeleton
              ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="animate-pulse border rounded-xl p-4 space-y-3">
                  <div className="h-48 bg-gray-200 rounded-lg w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mt-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))
              : displayedFeaturedProducts.map(product => (
                <motion.div key={product._id} variants={fadeUp} className="h-full">
                  <ProductCard product={product} />
                </motion.div>
              ))
            }
          </motion.div>
          {!isLoading && !isFetching && isError && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">Could not load featured products.</p>
              <Button variant="outline" onClick={handleRefetch}>Retry</Button>
            </div>
          )}
          {!isLoading && !isFetching && !isError && displayedFeaturedProducts.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-500">No featured products available right now.</p>
          )}
          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" className="w-full" onClick={() => router.push('/products')}>
              View All Products
            </Button>
          </div>
        </section>

        {/* VALUE PROPOSITION GRID */}
        <section className="py-12 border-t border-b border-gray-100">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={reduceMotion ? { once: true, amount: 0.2 } : { once: true, margin: "-48px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On all orders over NGN 50,000' },
              { icon: ShieldCheck, title: 'Secure Checkout', desc: '100% protected payments' },
              { icon: Clock, title: '24/7 Support', desc: 'Dedicated friendly assistance' }
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeUp} className="flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <feature.icon className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* FEATURED REVIEWS - Shopify Style */}
        <FeaturedReviews />

        {/* PROMO SPLIT SECTION */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={motionViewport}
          className="grid md:grid-cols-2 gap-12 items-center mb-24 overflow-hidden"
        >
          <motion.div variants={slideInLeft} className="relative group rounded-3xl overflow-hidden shadow-2xl max-h-[400px] lg:max-h-[450px] w-full max-w-xl mx-auto">
            <img
              src={resolveImageSrc(delivery)}
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
              alt="Fast Delivery"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
          </motion.div>

          <motion.div variants={slideInRight} className="space-y-6 md:pl-8">
            <span className="text-sm font-bold tracking-widest text-gray-500 uppercase">Premium Service</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight font-display">
              Fast, Reliable & <br />
              <span className="text-gray-400">Secure Delivery.</span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-md">
              Shop with absolute confidence knowing your luxury orders are handled with care and arrive right to your doorstep, exactly when you need them.
            </p>
            <div className="pt-4">
              <Button size="lg" className="bg-black text-white hover:bg-gray-800 text-lg px-8 py-6 rounded-xl font-medium shadow-lg" onClick={() => router.push('/products')}>
                Start Exploring
              </Button>
            </div>
          </motion.div>
        </motion.section>

      </div>
    </div>
  )
}







export default function Page() {
  return (<PageTransition>
    <PageContent />
  </PageTransition>
  );
}


