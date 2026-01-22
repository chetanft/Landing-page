import { useState, useRef, useEffect } from 'react'
import { Icon, FTLogo, Row, Col, UserProfile, UserProfileDropdown } from 'ft-design-system'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AppHeader() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setIsMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleMenuItemClick = (item: string) => {
    if (item === 'logout') {
      handleLogout()
      return
    }

    setIsMenuOpen(false)
  }

  const userName = user?.name?.trim() || ''
  const userRole = user?.userRole?.trim() || ''


  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)', padding: '0 var(--spacing-x6)', height: 'var(--spacing-x16)', display: 'flex', gap: 'var(--spacing-x4)', justifyContent: 'space-between', alignItems: 'center' }}>
      <Row align="middle" justify="center" style={{ flexWrap: 'nowrap', gap: 'var(--spacing-x4)', width: '100%', height: '100%', paddingTop: '8px', paddingBottom: '8px' }}>
        {/* Logo Section */}
        <Col>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x5)', justifyContent: 'center', width: 'fit-content' }}>
            {/* Menu Button in Circle */}
            <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '50%', padding: 'var(--spacing-x2)', width: 'var(--spacing-x14)', height: 'var(--spacing-x14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="menu" size={24} style={{ color: 'var(--text-secondary)' }} />
            </div>
            {/* Company Name Logo */}
            <FTLogo style={{ height: 'var(--spacing-x7)' }} />
          </div>
        </Col>

        {/* Notification Icons */}
        <Col style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x9)' }}>
              <Icon name="rocket" size={24} style={{ color: 'var(--text-secondary)' }} />
              <Icon name="bell" size={24} style={{ color: 'var(--text-secondary)' }} />
            </div>

            {/* User Profile with Dropdown */}
            <div style={{ backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-x4)', borderRadius: 'var(--radius-lg)', height: '100%', width: '100%', justifyContent: 'center' }}>
              {isAuthenticated && user ? (
                <div ref={menuRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <UserProfile
                    userName={userName}
                    userRole={userRole}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    style={{ width: '100%', height: '100%', justifyContent: 'center' }}
                  />
                  <UserProfileDropdown
                    isOpen={isMenuOpen}
                    userName={userName}
                    userRole={userRole}
                    onMenuItemClick={handleMenuItemClick}
                  />
                </div>
              ) : (
                <Icon name="user" size={24} style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}
