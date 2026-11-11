// User accounts (FR-3, FR-16, NFR-7).
// The Owner adds, edits, deactivates, reactivates and deletes Staff accounts and resets their
// passwords. Everyone can change their own name and password under "My account".
import { useEffect, useId, useState } from 'react'
import { useAuth } from '../../app/auth.js'
import { usersApi } from './usersApi.js'
import { accountStatus, passwordError, sortAccounts, suggestPassword, validateAccount } from './userUtils.js'
import styles from './admin.module.css'

const formatDate = (iso) =>
  iso ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date(iso)) : ''

export default function UsersPage() {
  const auth = useAuth()
  const isOwner = auth.role === 'owner'
  const [accounts, setAccounts] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    usersApi
      .listAccounts()
      .then((list) => active && setAccounts(list))
      .catch((e) => active && setLoadError(e.message))
    return () => {
      active = false
    }
  }, [])

  const replace = (updated) =>
    setAccounts((list) => (list.some((a) => a.id === updated.id) ? list.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)) : [...list, updated]))

  // Who "you" are: the signed-in user, or the sample Owner in sample mode.
  const me = auth.isSample
    ? accounts.find((a) => a.role === 'owner')
    : accounts.find((a) => a.id === auth.user?.id) ?? (auth.user && { id: auth.user.id, fullName: auth.fullName, email: auth.user.email, role: auth.role })

  return (
    <section className={styles.page}>
      <h1>User accounts</h1>
      {usersApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}

      {isOwner && <StaffAccounts accounts={accounts} onChanged={replace} />}
      {me && <MyAccount me={me} onChanged={replace} />}
    </section>
  )
}

// ------------------------------------------------------------------------- Owner: Staff accounts

function StaffAccounts({ accounts, onChanged }) {
  const [panel, setPanel] = useState(null) // { type: 'add' | 'edit' | 'password' | 'deactivate' | 'delete', account }
  const [notice, setNotice] = useState('')

  const open = (type, account = null) => {
    setNotice('')
    setPanel({ type, account })
  }

  function done(updated, message) {
    onChanged(updated)
    setNotice(message)
    setPanel(null)
  }

  async function reactivate(account) {
    setNotice('')
    try {
      done(await usersApi.reactivate(account.id), `${account.fullName} can sign in again.`)
    } catch (e) {
      setNotice('')
      setPanel({ type: 'error', account, message: e.message })
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <h2>Accounts</h2>
        <button type="button" onClick={() => open('add')}>Add staff account</button>
      </div>
      {notice && <p role="status" className={styles.success}>{notice}</p>}
      {panel?.type === 'error' && <p role="alert" className={styles.error}>{panel.message}</p>}

      {panel?.type === 'add' && (
        <AccountForm
          others={accounts}
          onCancel={() => setPanel(null)}
          onSave={(draft) => usersApi.createAccount(draft)}
          onSaved={(created) =>
            done(created, `Added ${created.fullName}. Give them their e-mail and temporary password in person; they can change the password under User accounts → My account.`)}
        />
      )}
      {panel?.type === 'edit' && (
        <AccountForm
          account={panel.account}
          others={accounts}
          onCancel={() => setPanel(null)}
          onSave={(draft) => usersApi.updateAccount(panel.account.id, draft)}
          onSaved={(updated) => done(updated, `Saved ${updated.fullName}.`)}
        />
      )}
      {panel?.type === 'password' && (
        <ResetPasswordForm
          account={panel.account}
          onCancel={() => setPanel(null)}
          onSaved={(updated) => done(updated, `New temporary password set for ${updated.fullName}. Give it to them in person.`)}
        />
      )}
      {panel?.type === 'deactivate' && (
        <Confirm
          title={`Deactivate ${panel.account.fullName}?`}
          text="They are signed out of the system within a minute and can't sign in until you reactivate the account. Their past sales and records stay."
          action="Deactivate"
          onCancel={() => setPanel(null)}
          onConfirm={() => usersApi.deactivate(panel.account.id)}
          onDone={(updated) => done(updated, `${updated.fullName} was deactivated.`)}
        />
      )}
      {panel?.type === 'delete' && (
        <Confirm
          title={`Delete ${panel.account.fullName}?`}
          text="The account can never sign in again, and this cannot be undone. Their name stays on the sales and audit entries they made, so history is kept. To block someone only for a while, deactivate instead."
          action="Delete account"
          onCancel={() => setPanel(null)}
          onConfirm={() => usersApi.deleteAccount(panel.account.id)}
          onDone={(updated) => done(updated, `${updated.fullName}'s account was deleted.`)}
        />
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>E-mail</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortAccounts(accounts).map((a) => {
              const status = accountStatus(a)
              const isStaff = a.role === 'staff' && !a.deletedAt
              return (
                <tr key={a.id} className={a.deletedAt ? styles.deleted : undefined}>
                  <td>{a.fullName}</td>
                  <td>{a.email}</td>
                  <td>{a.role === 'owner' ? 'Owner' : 'Staff'}</td>
                  <td>
                    <span className={`${styles.tag} ${status === 'Active' ? styles.tagActive : status === 'Deactivated' ? styles.tagInactive : ''}`}>
                      {status}
                    </span>
                  </td>
                  <td>{formatDate(a.createdAt)}</td>
                  <td>
                    {isStaff && (
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.link} aria-label={`Edit ${a.fullName}`} onClick={() => open('edit', a)}>Edit</button>
                        <button type="button" className={styles.link} aria-label={`Reset password for ${a.fullName}`} onClick={() => open('password', a)}>Reset password</button>
                        {a.isActive ? (
                          <button type="button" className={styles.link} aria-label={`Deactivate ${a.fullName}`} onClick={() => open('deactivate', a)}>Deactivate</button>
                        ) : (
                          <button type="button" className={styles.link} aria-label={`Reactivate ${a.fullName}`} onClick={() => reactivate(a)}>Reactivate</button>
                        )}
                        <button type="button" className={styles.link} aria-label={`Delete ${a.fullName}`} onClick={() => open('delete', a)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.muted}>No accounts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AccountForm({ account, others, onSave, onSaved, onCancel }) {
  const isEdit = Boolean(account)
  const [draft, setDraft] = useState({ id: account?.id, fullName: account?.fullName ?? '', email: account?.email ?? '', password: '' })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validateAccount(draft, { withPassword: !isEdit, others })
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      onSaved(await onSave({ fullName: draft.fullName.trim(), email: draft.email.trim(), password: draft.password }))
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  const label = isEdit ? `Edit ${account.fullName}` : 'Add staff account'
  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label={label}>
      <h2>{label}</h2>
      <div className={styles.grid}>
        <Field label="Name" error={errors.fullName}>
          <input value={draft.fullName} onChange={set('fullName')} autoComplete="off" />
        </Field>
        <Field label="E-mail (used to sign in)" error={errors.email}>
          <input value={draft.email} onChange={set('email')} type="email" autoComplete="off" />
        </Field>
        {!isEdit && (
          <PasswordField
            label="Temporary password"
            value={draft.password}
            error={errors.password}
            onChange={(password) => setDraft((d) => ({ ...d, password }))}
          />
        )}
      </div>
      {!isEdit && <p className={styles.hint}>New accounts are Staff. No e-mail is sent; tell the person their e-mail and temporary password yourself.</p>}
      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add account'}</button>
        <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function ResetPasswordForm({ account, onSaved, onCancel }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const message = passwordError(password)
    setError(message)
    setSaveError('')
    if (message) return
    setSaving(true)
    try {
      onSaved(await usersApi.resetPassword(account.id, password))
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label={`Reset password for ${account.fullName}`}>
      <h2>Reset password for {account.fullName}</h2>
      <div className={styles.grid}>
        <PasswordField label="New temporary password" value={password} error={error} onChange={setPassword} />
      </div>
      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Set password'}</button>
        <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function Confirm({ title, text, action, onConfirm, onDone, onCancel }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      onDone(await onConfirm())
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className={`${styles.panel} ${styles.confirmBox}`} role="group" aria-label={title}>
      <h2>{title}</h2>
      <p>{text}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.danger} onClick={handleConfirm} disabled={busy}>
          {busy ? 'Working…' : action}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------- Everyone: My account

function MyAccount({ me, onChanged }) {
  return (
    <div className={styles.section}>
      <h2>My account</h2>
      <p className={styles.muted}>
        {me.email} · {me.role === 'owner' ? 'Owner' : 'Staff'}
      </p>
      <NameForm me={me} onChanged={onChanged} />
      <PasswordForm />
    </div>
  )
}

function NameForm({ me, onChanged }) {
  const [name, setName] = useState(me.fullName ?? '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setNotice('')
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 100) {
      setError('Enter a name of 1 to 100 characters.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const updated = await usersApi.updateMyName(trimmed)
      onChanged({ ...me, ...updated })
      setNotice('Your name was saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label="Change my name">
      <h3>Name</h3>
      <div className={styles.grid}>
        <Field label="Your name" error={error}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
      </div>
      {notice && <p role="status" className={styles.success}>{notice}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save name'}</button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [draft, setDraft] = useState({ current: '', next: '', repeat: '' })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setNotice('')
    setSaveError('')
    const found = {}
    if (!draft.current) found.current = 'Enter your current password.'
    const message = passwordError(draft.next)
    if (message) found.next = message
    else if (draft.next === draft.current) found.next = 'Choose a password different from the current one.'
    if (draft.repeat !== draft.next) found.repeat = 'The two new passwords don’t match.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await usersApi.changeMyPassword(draft.current, draft.next)
      setDraft({ current: '', next: '', repeat: '' })
      setNotice('Your password was changed. Use the new one next time you sign in.')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label="Change my password">
      <h3>Password</h3>
      <div className={styles.grid}>
        <Field label="Current password" error={errors.current}>
          <input type="password" value={draft.current} onChange={set('current')} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.next}>
          <input type="password" value={draft.next} onChange={set('next')} autoComplete="new-password" />
        </Field>
        <Field label="New password again" error={errors.repeat}>
          <input type="password" value={draft.repeat} onChange={set('repeat')} autoComplete="new-password" />
        </Field>
      </div>
      <p className={styles.hint}>At least 8 characters.</p>
      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      {notice && <p role="status" className={styles.success}>{notice}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  )
}

// ------------------------------------------------------------------------- shared bits

// Shown as plain text so the Owner can read the temporary password out to the staff member.
function PasswordField({ label, value, error, onChange }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <span className={styles.passwordRow}>
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" spellCheck={false} />
        <button type="button" className={styles.secondary} onClick={() => onChange(suggestPassword())}>Suggest</button>
      </span>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label>
        {label}
        {children}
      </label>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
