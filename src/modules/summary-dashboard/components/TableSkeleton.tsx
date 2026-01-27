import { Card } from 'ft-design-system'

export default function TableSkeleton() {
  // Create skeleton columns
  const skeletonColumns = [
    { key: 'orderId', title: 'Order ID' },
    { key: 'soNumber', title: 'SO Number' },
    { key: 'status', title: 'Status' },
    { key: 'consignor', title: 'Consignor' },
    { key: 'destination', title: 'Destination' },
    { key: 'timestamp', title: 'Timestamp' },
  ]

  // Create skeleton data rows
  const skeletonData = Array.from({ length: 10 }).map((_, i) => ({
    id: `skeleton-${i}`,
    orderId: '',
    soNumber: '',
    status: '',
    consignor: '',
    destination: '',
    timestamp: '',
  }))

  return (
    <Card style={{ padding: 'var(--spacing-x5)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
        {/* Table Header Skeleton */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--spacing-x2)'
        }}>
          <div style={{ 
            width: '200px',
            height: '20px', 
            backgroundColor: 'var(--border-secondary)', 
            borderRadius: 'var(--radius-sm)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{ 
            width: '120px',
            height: '32px', 
            backgroundColor: 'var(--border-secondary)', 
            borderRadius: 'var(--radius-md)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
        </div>

        {/* Table Skeleton */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {skeletonColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: 'var(--spacing-x3)',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div style={{ 
                      width: '80px',
                      height: '16px', 
                      backgroundColor: 'var(--border-secondary)', 
                      borderRadius: 'var(--radius-sm)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletonData.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                  {skeletonColumns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: 'var(--spacing-x3)',
                      }}
                    >
                      <div style={{ 
                        width: col.key === 'orderId' ? '120px' : col.key === 'status' ? '80px' : '100px',
                        height: '16px', 
                        backgroundColor: 'var(--border-secondary)', 
                        borderRadius: 'var(--radius-sm)',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 'var(--spacing-x4)'
        }}>
          <div style={{ 
            width: '150px',
            height: '16px', 
            backgroundColor: 'var(--border-secondary)', 
            borderRadius: 'var(--radius-sm)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{ display: 'flex', gap: 'var(--spacing-x2)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'var(--border-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
