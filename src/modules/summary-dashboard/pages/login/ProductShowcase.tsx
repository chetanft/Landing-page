import { useState, useEffect } from 'react'
import { Typography, Button } from 'ft-design-system'
import { productSlides } from './loginSlides'

/**
 * Product showcase carousel for login page right panel
 */
export default function ProductShowcase() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % productSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '16px 0 16px 0',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px'
      }}>
        {/* What's New */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: 'var(--text-secondary)'
          }} />
          <Typography variant="body-secondary-semibold" style={{
            color: 'var(--color-primary)',
            fontSize: '14px'
          }}>
            What's New?
          </Typography>
        </div>

        {/* View Release Button */}
        <Button
          variant="secondary"
          icon="chevron-right"
          iconPosition="trailing"
          style={{
            height: '40px',
            width: '163px',
            borderRadius: '8px',
            border: '1px solid var(--border-primary)',
            fontSize: '16px',
            fontWeight: 500
          }}
        >
          View Release
        </Button>
      </div>

      {/* Content Carousel */}
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '0 20px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          gap: '32px',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(-${currentSlide * (876 + 32)}px)`,
          width: 'max-content'
        }}>
          {productSlides.map((slide, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--border-primary)',
                borderRadius: '16px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
                background: slide.cardGradient,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                overflow: 'hidden',
                width: '876px',
                minWidth: '876px',
                opacity: currentSlide === index ? 1 : 0.5,
                transform: currentSlide === index ? 'scale(1)' : 'scale(0.98)',
                transition: 'all 0.5s ease'
              }}
            >
              {/* Section Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Typography variant="title-primary" style={{
                  color: 'var(--primary)',
                  background: slide.textGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '32px',
                  fontWeight: 600
                }}>
                  {slide.title}
                </Typography>
                <Typography variant="body-primary-regular" style={{
                  color: 'var(--text-secondary)',
                  fontSize: '16px',
                  lineHeight: 1.4,
                  display: 'flex',
                  width: '100%'
                }}>
                  {slide.description}
                </Typography>
              </div>

              {/* Product Image */}
              <div style={{
                flex: 1,
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <img
                  src={slide.image}
                  alt={slide.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top left'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '3px'
      }}>
        {productSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            style={{
              width: currentSlide === index ? '36px' : '8px',
              height: '8px',
              borderRadius: '100px',
              backgroundColor: currentSlide === index
                ? 'var(--primary)'
                : 'var(--border-primary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  )
}
