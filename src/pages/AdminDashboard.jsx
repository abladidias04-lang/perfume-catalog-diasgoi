import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [perfumes, setPerfumes] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('') 
  const [volume, setVolume] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  
  // ЖАҢА: Жынысы (Бастапқыда Унисекс тұрады)
  const [gender, setGender] = useState('Унисекс')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    setBrand('') 
    setVolume('')
    setPrice('')
    setDescription('')
    setGender('Унисекс') // Тазалағанда унисекске қайтады
    setImageFile(null)
    setExistingImageUrl('')
    setShowForm(true)
  }

  function handleEdit(perfume) {
    setEditingId(perfume.id)
    setName(perfume.name)
    setBrand(perfume.brand || '') 
    setVolume(perfume.volume)
    setPrice(perfume.price)
    setDescription(perfume.description || '')
    setGender(perfume.gender || 'Унисекс') // Базада бар болса сол шығады
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
        brand: brand, 
        volume: parseInt(volume),
        price: parseInt(price),
        description: description,
        image_url: finalImageUrl,
        gender: gender // ЖАҢА: Базаға сақтау
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

  const filteredPerfumes = perfumes.filter(p => {
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
    const searchableText = `${p.brand || ''} ${p.name || ''} ${p.description || ''} ${p.gender || ''}`.toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });

  const sortedPerfumes = [...filteredPerfumes].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (loading) return <div className="p-10 text-center">Күте тұрыңыз...</div>

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="text-xl font-black text-gray-900">by GULNAZ INAYATULLA<span className="text-indigo-600">.</span></div>
          <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl">Шығу</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Парфюмдер тізімі <span className="text-sm text-gray-500">({sortedPerfumes.length})</span></h1>
          <button onClick={handleAddNew} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm">+ Жаңа қосу</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Атауы немесе бренд бойынша іздеу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-medium w-full sm:w-auto cursor-pointer"
          >
            <option value="newest">Жаңа түсімдер</option>
            <option value="alphabetical">А-Я (Алфавит)</option>
            <option value="price-asc">Арзаннан қымбатқа</option>
            <option value="price-desc">Қымбаттан арзанға</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPerfumes.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
              Ештеңе табылмады. Басқа сөз жазып көріңіз.
            </div>
          ) : (
            sortedPerfumes.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                  <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    {p.brand && <p className="text-[10px] text-indigo-500 font-bold uppercase truncate">{p.brand}</p>}
                    <h3 className="font-bold text-gray-900 truncate">
                      {p.name} 
                      {/* ЖАҢА: Тізімде жынысын кішкентай етіп көрсету */}
                      {p.gender && <span className="ml-2 bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-medium">{p.gender}</span>}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{p.volume} мл • {p.price.toLocaleString('kk-KZ')} ₸</p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto justify-end flex-shrink-0">
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
            ))
          )}
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
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Бренд / Категория</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Tom Ford" className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50" />
                </div>
                {/* ЖАҢА: Формада Жынысын таңдау */}
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Пол</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 outline-none">
                    <option value="Мужской">Мужской</option>
                    <option value="Женский">Женский</option>
                    <option value="Унисекс">Унисекс</option>
                  </select>
                </div>
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