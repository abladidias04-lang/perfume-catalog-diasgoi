import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [perfumes, setPerfumes] = useState([])

  // Форма стейттері
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('') // ЖАҢА: Бренд стейті
  const [volume, setVolume] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Өзгертуге (Edit) арналған стейттер
  const [editingId, setEditingId] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState('')

  useEffect(() => {
    checkUser()
    fetchPerfumes()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) navigate('/admin')
    else setLoading(false)
  }

  async function fetchPerfumes() {
    const { data } = await supabase.from('perfumes').select('*').order('created_at', { ascending: false })
    if (data) setPerfumes(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  async function handleDelete(id, imageUrl) {
    const isConfirmed = window.confirm('Бұл парфюмді толықтай өшіргіңіз келетініне сенімдісіз бе?')
    if (!isConfirmed) return

    try {
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop()
        await supabase.storage.from('perfume-images').remove([fileName])
      }
      const { error } = await supabase.from('perfumes').delete().eq('id', id)
      if (error) throw error
      setPerfumes(perfumes.filter(p => p.id !== id))
      alert('Парфюм сәтті өшірілді! 🗑️')
    } catch (error) {
      alert('Қате шықты: ' + error.message)
    }
  }

  function handleAddNew() {
    setEditingId(null)
    setName('')
    setBrand('') // Тазалау
    setVolume('')
    setPrice('')
    setDescription('')
    setImageFile(null)
    setExistingImageUrl('')
    setShowForm(true)
  }

  function handleEdit(perfume) {
    setEditingId(perfume.id)
    setName(perfume.name)
    setBrand(perfume.brand || '') // Толтыру
    setVolume(perfume.volume)
    setPrice(perfume.price)
    setDescription(perfume.description || '')
    setExistingImageUrl(perfume.image_url)
    setImageFile(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!editingId && !imageFile) return alert('Сурет таңдаңыз!')
    setIsSubmitting(true)

    try {
      let finalImageUrl = existingImageUrl

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('perfume-images').upload(fileName, imageFile)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('perfume-images').getPublicUrl(fileName)
        finalImageUrl = publicUrl
      }

      const perfumeData = {
        name: name,
        brand: brand, // Базаға сақтау
        volume: parseInt(volume),
        price: parseInt(price),
        description: description,
        image_url: finalImageUrl
      }

      if (editingId) {
        const { error: dbError } = await supabase.from('perfumes').update(perfumeData).eq('id', editingId)
        if (dbError) throw dbError
        alert('Парфюм сәтті өзгертілді! ✏️')
      } else {
        const { error: dbError } = await supabase.from('perfumes').insert([perfumeData])
        if (dbError) throw dbError
        alert('Парфюм сәтті қосылды! ✨')
      }

      setShowForm(false)
      fetchPerfumes()
    } catch (error) {
      alert('Қате шықты: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-10 text-center">Күте тұрыңыз...</div>

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="text-xl font-black text-gray-900">AURA<span className="text-indigo-600">.</span></div>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl">Шығу</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Парфюмдер тізімі</h1>
          <button onClick={handleAddNew} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm">+ Жаңа парфюм қосу</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfumes.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 w-full">
                <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  {/* Тізімде брендті көрсету */}
                  {p.brand && <p className="text-[10px] text-indigo-500 font-bold uppercase">{p.brand}</p>}
                  <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.volume} мл • {p.price.toLocaleString('kk-KZ')} ₸</p>
                </div>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                <button 
                  onClick={() => handleEdit(p)} 
                  className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Өзгерту
                </button>
                <button 
                  onClick={() => handleDelete(p.id, p.image_url)} 
                  className="text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Өшіру
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* МОДАЛЬДЫ ТЕРЕЗЕ (ФОРМА) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">{editingId ? 'Парфюмді өзгерту' : 'Жаңа парфюм'}</h2>
              <button onClick={() => setShowForm(false)} className="bg-gray-100 rounded-full w-8 h-8 font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ЖАҢА: Бренд енгізу өрісі */}
              <div>
                <label className="block text-sm font-bold mb-1">Бренд немесе Категория</label>
                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Мысалы: Tom Ford" className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Атауы</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Көлемі (мл)</label>
                  <input required type="number" value={volume} onChange={e => setVolume(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Бағасы (₸)</label>
                  <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">Сипаттамасы</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows="3" className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Суреті</label>
                <input type="file" required={!editingId} accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 mb-2" />
                {editingId && <p className="text-xs text-gray-400">Егер суретті ауыстырғыңыз келмесе, бос қалдырыңыз.</p>}
              </div>
              
              <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-700 shadow-md">
                {isSubmitting ? 'Сақталуда...' : (editingId ? 'Өзгерістерді сақтау' : 'Сақтау және Жариялау')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}