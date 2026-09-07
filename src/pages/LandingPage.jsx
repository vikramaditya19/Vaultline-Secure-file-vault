import { useNavigate } from 'react-router-dom'
import { FileList } from '../components/files/FileList'
import { Button } from '../components/common/Button'
import { useToast } from '../hooks/useToast'
import './LandingPage.css'

const demoFiles = [
  {
    id: 'demo-1',
    metadata: { filename: 'Demo Document.pdf' },
    sizeBytes: 245760,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isOwner: true,
  },
  {
    id: 'demo-2',
    metadata: { filename: 'Project Plan.docx' },
    sizeBytes: 512000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isOwner: true,
  },
  {
    id: 'demo-3',
    metadata: { filename: 'Public Image.png' },
    sizeBytes: 102400,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    isOwner: false,
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const toast = useToast()

  function handleDownload(file) {
    toast.info(`Demo download not available for ${file.metadata.filename}`)
  }

  function handleDelete(file) {
    toast.info(`Demo files cannot be deleted in this demo`) 
  }

  function handleShare(file) {
    toast.info(`Demo share not enabled for ${file.metadata.filename}`)
  }

  return (
    <div className="landing-page">
      <header className="landing-hero">
        <div className="landing-hero__inner">
          <h1 className="landing-hero__title">Welcome to Vaultline</h1>
          <p className="landing-hero__subtitle">Securely store and share encrypted files. This demo shows example files to help you explore the UI.</p>
          <div className="landing-hero__actions">
            <Button onClick={() => navigate('/register')}>Create account</Button>
            <Button variant="secondary" onClick={() => navigate('/login')}>Sign in</Button>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-section">
          <h2 className="landing-section__title">Demo files</h2>
          <FileList
            files={demoFiles}
            isLoading={false}
            error={null}
            onRetry={() => {}}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onShare={handleShare}
            emptyProps={{}}
          />
        </section>
      </main>
    </div>
  )
}

export default LandingPage
