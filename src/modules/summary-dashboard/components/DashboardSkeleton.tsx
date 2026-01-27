import { Card } from 'ft-design-system'

export default function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x6)', padding: 'var(--spacing-x6)' }}>
      {/* Quick KPI Row Skeleton */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--spacing-x4)'
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 'var(--spacing-x4)',
            minHeight: '80px'
          }}>
            <div style={{ 
              width: '60%', 
              height: '12px', 
              backgroundColor: 'var(--border-secondary)', 
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--spacing-x2)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{ 
              width: '40%', 
              height: '28px', 
              backgroundColor: 'var(--border-secondary)', 
              borderRadius: 'var(--radius-sm)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </Card>
        ))}
      </div>

      {/* Lifecycle Columns Skeleton */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-x5)'
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} style={{ 
            minHeight: '96px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: 'var(--spacing-x4)',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-primary)'
            }}>
              <div style={{ 
                width: '50%', 
                height: '16px', 
                backgroundColor: 'var(--border-secondary)', 
                borderRadius: 'var(--radius-sm)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <div style={{ 
                width: '40px',
                height: '24px', 
                backgroundColor: 'var(--border-secondary)', 
                borderRadius: '100px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            </div>
            <div style={{ padding: 'var(--spacing-x2)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x1)' }}>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: 'var(--spacing-x3)'
                }}>
                  <div style={{ 
                    width: '60%', 
                    height: '12px', 
                    backgroundColor: 'var(--border-secondary)', 
                    borderRadius: 'var(--radius-sm)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                  <div style={{ 
                    width: '32px',
                    height: '20px', 
                    backgroundColor: 'var(--border-secondary)', 
                    borderRadius: 'var(--radius-sm)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
