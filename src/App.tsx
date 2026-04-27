import React, { useEffect, useRef, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from './types'
import { invokeWrapper } from './utils/invokeTauri'
import { match } from 'ts-pattern'

// Design tokens
const CM = {
  brand: '#9333ea',
  brandHover: '#a855f7',
  bgApp: '#f6f6f6',
  bgPanel: '#ffffff',
  border: '#e4e4e7',
  borderStrong: '#d4d4d8',
  textPrimary: '#0f0f0f',
  textSecondary: '#71717a',
  textMuted: '#a1a1aa',
  success: '#22c55e',
  successLight: '#dcfce7',
  error: '#ef4444',
  errorLight: '#fee2e2',
}

// Eye icon for password toggle
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
)

// Check circle icon
const CheckCircle = () => (
  <svg width={64} height={64} fill="none" stroke={CM.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

// X circle icon
const XCircle = () => (
  <svg width={40} height={40} fill="none" stroke={CM.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
)

// Spinner
const Spinner = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
    </path>
  </svg>
)

const App: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>()
  const [mode, setMode] = useState<'local' | 'cloud'>('local')
  const [showApiKey, setShowApiKey] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)
  const tenantRef = useRef<HTMLInputElement>(null)
  const dbRef = useRef<HTMLInputElement>(null)
  const apiKeyRef = useRef<HTMLInputElement>(null)

  async function connect() {
    setLoading(true)
    setSuccess(false)
    setError(null)

    const url = urlRef.current?.value || (mode === 'local' ? 'http://localhost:8000' : 'https://api.trychroma.com')
    const database = dbRef.current?.value || 'default_database'

    const config =
      mode === 'local'
        ? {
            mode: 'local' as const,
            url,
            tenant: tenantRef.current?.value || 'default_tenant',
            database,
          }
        : {
            mode: 'cloud' as const,
            url,
            apiKey: apiKeyRef.current?.value ?? '',
            database,
          }

    match(
      await invokeWrapper(TauriCommand.CREATE_CLIENT, { config }),
    ).with({ type: 'error' }, ({ error }) => {
      console.error(error)
    })

    match(await invokeWrapper(TauriCommand.HEALTH_CHECK)).with(
      { type: 'error' },
      ({ error }) => {
        console.error(error)
        setError(error)
        setLoading(false)
        return
      },
    )

    if (mode === 'local') {
      const result = await invokeWrapper<boolean>(
        TauriCommand.CHECK_TENANT_AND_DATABASE,
        { database },
      )

      const is_success = match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          setError(error)
          setLoading(false)
          return false
        })
        .with({ type: 'success' }, ({ result }) => {
          if (!result) {
            console.error(`database ${database} not found`)
            setError(`database ${database} not found`)
            setLoading(false)
            return false
          }
        })
        .exhaustive()

      if (is_success == false) {
        return
      }
    }

    setLoading(false)
    setError(null)
    setSuccess(true)

    setTimeout(() => {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`, url)
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`, database)
      if (mode === 'local' && config.mode === 'local') {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`, config.tenant)
      }
      invokeWrapper(TauriCommand.CREATE_WINDOW, { url })
    }, 2000)
  }

  useEffect(() => {
    const currentWindow = getCurrentWindow()
    currentWindow.listen('tauri://window-created', () => {
      currentWindow.close()
    })
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: ${CM.bgApp}; -webkit-font-smoothing: antialiased; }
        .cm-input {
          width: 100%;
          padding: 8px 12px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: ${CM.textPrimary};
          background: ${CM.bgPanel};
          border: 1px solid ${CM.borderStrong};
          border-radius: 8px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cm-input:focus {
          border-color: ${CM.brand};
          box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.2);
        }
        .cm-input::placeholder { color: ${CM.textMuted}; }
        .cm-btn-connect {
          width: 100%;
          padding: 11px 0;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: white;
          background: ${CM.brand};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, opacity 0.15s;
          letter-spacing: -0.01em;
        }
        .cm-btn-connect:hover:not(:disabled) { background: ${CM.brandHover}; }
        .cm-btn-connect:disabled { opacity: 0.5; cursor: not-allowed; }
        .cm-tab {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .cm-tab-active {
          background: white;
          color: ${CM.brand};
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .cm-tab-inactive {
          background: transparent;
          color: ${CM.textSecondary};
        }
        .cm-tab-inactive:hover { color: ${CM.textPrimary}; }
        .cm-pw-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .cm-pw-wrap .cm-input {
          padding-right: 40px;
        }
        .cm-pw-toggle {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          color: ${CM.textMuted};
          display: flex;
          align-items: center;
          padding: 0;
          line-height: 0;
          transition: color 0.15s;
        }
        .cm-pw-toggle:hover { color: ${CM.textPrimary}; }
      `}</style>

      <div style={{
        height: '100vh',
        background: CM.bgApp,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          width: 400,
          background: CM.bgPanel,
          borderRadius: 16,
          padding: '40px 36px',
          border: `1px solid ${CM.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}>
          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img
              src="/chromamind_app_icon.svg"
              width={72}
              height={72}
              alt="ChromaMind"
              style={{ display: 'block', margin: '0 auto 16px' }}
            />
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: CM.textPrimary,
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
            }}>
              Connect to ChromaDB
            </h1>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: '#f4f4f5',
            borderRadius: 8,
            padding: 3,
            marginBottom: 24,
            gap: 3,
          }}>
            {(['local', 'cloud'] as const).map(m => (
              <button
                key={m}
                className={`cm-tab ${mode === m ? 'cm-tab-active' : 'cm-tab-inactive'}`}
                onClick={() => setMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Fields */}
          <form
            onSubmit={(e) => { e.preventDefault(); connect() }}
            aria-label="form"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: CM.textPrimary,
                }}>
                  URL <span style={{ color: CM.error }}>*</span>
                </label>
                <input
                  className="cm-input"
                  type="text"
                  ref={urlRef}
                  data-testid="url-input"
                  placeholder={mode === 'local' ? 'http://localhost:8000' : 'https://api.trychroma.com'}
                />
              </div>

              {mode === 'local' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: CM.textPrimary,
                  }}>
                    Tenant
                  </label>
                  <input
                    className="cm-input"
                    type="text"
                    ref={tenantRef}
                    placeholder="default_tenant"
                  />
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: CM.textPrimary,
                }}>
                  Database
                </label>
                <input
                  className="cm-input"
                  type="text"
                  ref={dbRef}
                  placeholder="default_database"
                />
              </div>

              {mode === 'cloud' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: CM.textPrimary,
                  }}>
                    API Key <span style={{ color: CM.error }}>*</span>
                  </label>
                  <div className="cm-pw-wrap">
                    <input
                      className="cm-input"
                      type={showApiKey ? 'text' : 'password'}
                      ref={apiKeyRef}
                      data-testid="api-key-input"
                      placeholder="••••••••••••••••"
                    />
                    <button
                      type="button"
                      className="cm-pw-toggle"
                      onClick={() => setShowApiKey(v => !v)}
                      tabIndex={-1}
                    >
                      <EyeIcon open={showApiKey} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="cm-btn-connect"
              type="submit"
              disabled={loading}
              style={{ marginTop: 28 }}
            >
              {loading ? <Spinner /> : null}
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </form>

          {/* Status feedback */}
          {success && (
            <div style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
              background: CM.successLight,
              borderRadius: 8,
            }}>
              <CheckCircle />
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 16px',
              background: CM.errorLight,
              borderRadius: 8,
            }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <XCircle />
              </div>
              <span style={{ fontSize: 13, color: CM.error, lineHeight: 1.5 }}>
                {error}
              </span>
            </div>
          )}

          <p style={{
            textAlign: 'center',
            fontSize: 11,
            color: CM.textMuted,
            marginTop: 20,
          }}>
            ChromaMind v0.1.0
          </p>
        </div>
      </div>
    </>
  )
}

export default App
