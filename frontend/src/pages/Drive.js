import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Drive() {
  const { folderId } = useParams();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadForm, setUploadForm] = useState({ name: '', file: null });
  const [error, setError] = useState('');
  const [previewImg, setPreviewImg] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = folderId ? { parent: folderId } : {};
      const [fRes, iRes] = await Promise.all([
        api.get('/folders', { params }),
        folderId ? api.get('/images', { params: { folder: folderId } }) : Promise.resolve({ data: [] }),
      ]);
      setFolders(fRes.data);
      setImages(iRes.data);
      if (folderId) {
        const bRes = await api.get(`/folders/${folderId}/path`);
        setBreadcrumb(bRes.data);
      } else {
        setBreadcrumb([]);
      }
    } catch (err) {
      setError('Failed to load');
    }
  }, [folderId]);

  useEffect(() => { load(); }, [load]);

  const createFolder = async e => {
    e.preventDefault();
    try {
      await api.post('/folders', { name: newFolderName, parent: folderId || null });
      setNewFolderName('');
      setShowNewFolder(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const deleteFolder = async id => {
    if (!window.confirm('Delete this folder and all its contents?')) return;
    await api.delete(`/folders/${id}`);
    load();
  };

  const uploadImage = async e => {
    e.preventDefault();
    if (!folderId) return setError('Open a folder first to upload images');
    const formData = new FormData();
    formData.append('name', uploadForm.name);
    formData.append('image', uploadForm.file);
    formData.append('folder', folderId);
    try {
      await api.post('/images', formData);
      setUploadForm({ name: '', file: null });
      setShowUpload(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
  };

  const deleteImage = async id => {
    await api.delete(`/images/${id}`);
    load();
  };

  return (
    <div className="drive-app">
      {/* Header */}
      <header className="drive-header">
        <div className="drive-header-left">
          <div className="header-logo">
            <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" alt="Drive" />
            <span>Drive</span>
          </div>
        </div>
        <div className="drive-header-right">
          <span className="user-info">{user?.username}</span>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="drive-body">
        {/* Sidebar */}
        <aside className="drive-sidebar">
          <button className="new-btn" onClick={() => setShowNewFolder(true)}>
            <span>+</span> New
          </button>
          <nav>
            <div className="sidebar-item active" onClick={() => nav('/')}>
              <span className="sidebar-icon">🏠</span> My Drive
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="drive-main">
          {error && <div className="error-msg" onClick={() => setError('')}>{error} ✕</div>}

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <span className="bc-item" onClick={() => nav('/')}>My Drive</span>
            {breadcrumb.map((b, i) => (
              <span key={b._id}>
                <span className="bc-sep"> › </span>
                <span className="bc-item" onClick={() => nav(`/folder/${b._id}`)}>{b.name}</span>
              </span>
            ))}
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <h3>{breadcrumb.length ? breadcrumb[breadcrumb.length - 1]?.name : 'My Drive'}</h3>
            <div className="toolbar-actions">
              <button className="toolbar-btn" onClick={() => setShowNewFolder(true)}>📁 New Folder</button>
              {folderId && <button className="toolbar-btn primary" onClick={() => setShowUpload(true)}>⬆ Upload Image</button>}
            </div>
          </div>

          {/* New Folder Modal */}
          {showNewFolder && (
            <div className="modal-overlay" onClick={() => setShowNewFolder(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>New Folder</h3>
                <form onSubmit={createFolder}>
                  <input autoFocus placeholder="Folder name" value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)} required />
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowNewFolder(false)}>Cancel</button>
                    <button type="submit" className="primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Upload Modal */}
          {showUpload && (
            <div className="modal-overlay" onClick={() => setShowUpload(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Upload Image</h3>
                <form onSubmit={uploadImage}>
                  <input autoFocus placeholder="Image name" value={uploadForm.name}
                    onChange={e => setUploadForm({...uploadForm, name: e.target.value})} required />
                  <input type="file" accept="image/*"
                    onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})} required />
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowUpload(false)}>Cancel</button>
                    <button type="submit" className="primary">Upload</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {previewImg && (
            <div className="modal-overlay" onClick={() => setPreviewImg(null)}>
              <div className="preview-modal" onClick={e => e.stopPropagation()}>
                <button className="preview-close" onClick={() => setPreviewImg(null)}>✕</button>
                <img src={`${API_URL}/uploads/${previewImg.filename}`} alt={previewImg.name} />
                <p>{previewImg.name} — {formatSize(previewImg.size)}</p>
              </div>
            </div>
          )}

          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="section">
              <p className="section-label">Folders</p>
              <div className="grid">
                {folders.map(f => (
                  <div key={f._id} className="folder-card" onDoubleClick={() => nav(`/folder/${f._id}`)}>
                    <div className="folder-card-inner">
                      <span className="folder-icon">📁</span>
                      <div className="folder-info">
                        <span className="folder-name">{f.name}</span>
                        <span className="folder-size">{formatSize(f.size)}</span>
                      </div>
                      <button className="item-delete" onClick={e => { e.stopPropagation(); deleteFolder(f._id); }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Grid */}
          {images.length > 0 && (
            <div className="section">
              <p className="section-label">Images</p>
              <div className="grid">
                {images.map(img => (
                  <div key={img._id} className="image-card" onClick={() => setPreviewImg(img)}>
                    <img src={`${API_URL}/uploads/${img.filename}`} alt={img.name} />
                    <div className="image-info">
                      <span className="image-name">{img.name}</span>
                      <span className="image-size">{formatSize(img.size)}</span>
                    </div>
                    <button className="item-delete" onClick={e => { e.stopPropagation(); deleteImage(img._id); }}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {folders.length === 0 && images.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p>This folder is empty</p>
              <p className="empty-sub">Create a new folder or upload images</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
