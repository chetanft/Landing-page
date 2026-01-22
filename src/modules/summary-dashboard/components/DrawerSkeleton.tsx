import { Card } from 'ft-design-system'

interface DrawerSkeletonProps {
  variant?: 'details' | 'timeline' | 'comments'
}

export default function DrawerSkeleton({ variant = 'details' }: DrawerSkeletonProps) {
  if (variant === 'details') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x5)', padding: 'var(--spacing-x5)' }}>
        {/* Order Summary Card Skeleton */}
        <Card style={{ padding: 'var(--spacing-x5)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-x4)',
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
                <div style={{
                  width: '100px',
                  height: '14px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  width: '150px',
                  height: '18px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: 'var(--spacing-x1)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
            ))}
          </div>
        </Card>

        {/* Status and Milestones Card Skeleton */}
        <Card style={{ padding: 'var(--spacing-x5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-x2)' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '80px',
                    height: '24px',
                    backgroundColor: 'var(--border-secondary)',
                    borderRadius: '100px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x1)' }}>
                <div style={{
                  width: '60px',
                  height: '14px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  width: '200px',
                  height: '16px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
            ))}
          </div>
        </Card>

        {/* Parties Card Skeleton */}
        <Card style={{ padding: 'var(--spacing-x5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
            <div style={{
              width: '100px',
              height: '18px',
              backgroundColor: 'var(--border-secondary)',
              borderRadius: 'var(--radius-sm)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
                <div style={{
                  width: '120px',
                  height: '14px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  width: '180px',
                  height: '16px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (variant === 'timeline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)', padding: 'var(--spacing-x5)' }}>
        {Array.from({ length: 3 }).map((_, dateIndex) => (
          <div key={dateIndex}>
            {/* Date Separator Skeleton */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-x3)',
              marginBottom: 'var(--spacing-x4)',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
              <div style={{
                padding: '2px 8px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '100px',
              }}>
                <div style={{
                  width: '80px',
                  height: '16px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
            </div>

            {/* Timeline Events Skeleton */}
            <div style={{ display: 'flex', gap: 'var(--spacing-x3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  width: '2px',
                  height: '100px',
                  backgroundColor: 'var(--border-secondary)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
                {Array.from({ length: 2 }).map((_, eventIndex) => (
                  <div key={eventIndex} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
                    <div style={{
                      width: '150px',
                      height: '16px',
                      backgroundColor: 'var(--border-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <div style={{
                      width: '200px',
                      height: '14px',
                      backgroundColor: 'var(--border-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <div style={{
                      width: '120px',
                      height: '14px',
                      backgroundColor: 'var(--border-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'comments') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)', padding: 'var(--spacing-x5)' }}>
        {/* Comment Input Skeleton */}
        <Card style={{ padding: 'var(--spacing-x4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x3)' }}>
            <div style={{
              width: '100%',
              height: '80px',
              backgroundColor: 'var(--border-secondary)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-x2)' }}>
              <div style={{
                width: '80px',
                height: '32px',
                backgroundColor: 'var(--border-secondary)',
                borderRadius: 'var(--radius-md)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            </div>
          </div>
        </Card>

        {/* Comments List Skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ padding: 'var(--spacing-x4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '16px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  width: '100px',
                  height: '14px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
              <div style={{
                width: '100%',
                height: '60px',
                backgroundColor: 'var(--border-secondary)',
                borderRadius: 'var(--radius-sm)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return null
}
