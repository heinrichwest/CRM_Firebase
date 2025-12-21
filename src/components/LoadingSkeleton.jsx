import './LoadingSkeleton.css'

/**
 * Reusable loading skeleton component
 * @param {Object} props
 * @param {string} props.type - Type of skeleton: "text", "title", "avatar", "button", "card", "table", "list"
 * @param {number} props.count - Number of items to show (for list/table types)
 * @param {string} props.width - Custom width (e.g., "200px", "100%")
 * @param {string} props.height - Custom height (e.g., "20px", "100px")
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSkeleton = ({
  type = 'text',
  count = 1,
  width,
  height,
  className = ''
}) => {
  const style = {}
  if (width) style.width = width
  if (height) style.height = height

  const renderSkeleton = () => {
    switch (type) {
      case 'title':
        return <div className="skeleton skeleton-title" style={style} />

      case 'avatar':
        return <div className="skeleton skeleton-avatar" style={style} />

      case 'button':
        return <div className="skeleton skeleton-button" style={style} />

      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton skeleton-card-header" />
            <div className="skeleton-card-body">
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          </div>
        )

      case 'table':
        return (
          <div className="skeleton-table">
            <div className="skeleton-table-header">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton skeleton-table-cell" />
              ))}
            </div>
            {[...Array(count)].map((_, rowIdx) => (
              <div key={rowIdx} className="skeleton-table-row">
                {[...Array(4)].map((_, cellIdx) => (
                  <div key={cellIdx} className="skeleton skeleton-table-cell" />
                ))}
              </div>
            ))}
          </div>
        )

      case 'list':
        return (
          <div className="skeleton-list">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="skeleton-list-item">
                <div className="skeleton skeleton-avatar" style={{ width: '40px', height: '40px' }} />
                <div className="skeleton-list-content">
                  <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        )

      case 'dashboard':
        return (
          <div className="skeleton-dashboard">
            <div className="skeleton-dashboard-header">
              <div className="skeleton skeleton-title" style={{ width: '200px' }} />
              <div className="skeleton skeleton-button" />
            </div>
            <div className="skeleton-dashboard-cards">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-stat-card">
                  <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                  <div className="skeleton skeleton-title" style={{ width: '70%' }} />
                </div>
              ))}
            </div>
          </div>
        )

      case 'text':
      default:
        if (count > 1) {
          return (
            <div className="skeleton-text-group">
              {[...Array(count)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton skeleton-text"
                  style={{
                    ...style,
                    width: i === count - 1 ? '60%' : style.width || '100%'
                  }}
                />
              ))}
            </div>
          )
        }
        return <div className="skeleton skeleton-text" style={style} />
    }
  }

  return (
    <div className={`loading-skeleton ${className}`} aria-busy="true" aria-label="Loading...">
      {renderSkeleton()}
    </div>
  )
}

/**
 * Page-level loading skeleton
 */
export const PageLoadingSkeleton = ({ title = 'Loading...' }) => (
  <div className="page-loading-skeleton">
    <LoadingSkeleton type="title" width="250px" />
    <LoadingSkeleton type="text" count={3} />
    <div style={{ height: '20px' }} />
    <LoadingSkeleton type="card" />
    <div style={{ height: '20px' }} />
    <LoadingSkeleton type="table" count={5} />
  </div>
)

/**
 * Table loading skeleton
 */
export const TableLoadingSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {[...Array(columns)].map((_, i) => (
        <div key={i} className="skeleton skeleton-table-cell" />
      ))}
    </div>
    {[...Array(rows)].map((_, rowIdx) => (
      <div key={rowIdx} className="skeleton-table-row">
        {[...Array(columns)].map((_, cellIdx) => (
          <div key={cellIdx} className="skeleton skeleton-table-cell" />
        ))}
      </div>
    ))}
  </div>
)

export default LoadingSkeleton
