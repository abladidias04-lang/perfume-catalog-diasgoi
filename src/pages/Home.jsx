import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import PerfumeCard from '../components/PerfumeCard'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [perfumes, setPerfumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')
  const [volumeFilter, setVolumeFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [selectedPerfume, setSelectedPerfume] = useState(null)

  // ЖАҢА: СЕБЕТ (CART) СТЕЙТТЕРІ
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => { fetchPerfumes() }, [])

  async function fetchPerfumes() {
    const { data } = await supabase.from('perfumes').select('*').order('created_at', { ascending: false })
    if (data) setPerfumes(data)
    setLoading(false)
  }

  // --- СЕБЕТ ФУНКЦИЯЛАРЫ ---
  const addToCart = (perfume) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === perfume.id)
      if (existing) {
        return prev.map(item => item.id === perfume.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...perfume, quantity: 1 }]
    })
    setIsCartOpen(true) // Қосқан кезде себетті ашып көрсетеміз
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta
        return newQ > 0 ? { ...item, quantity: newQ } : item
      }
      return item
    }))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // ЖАҢА: Бүкіл себетті WhatsApp-қа жіберу
  const getCartWhatsAppUrl = () => {
    const phoneNumber = "7054298068" // Өз нөміріңіз
    let textMessage = "Сәлеметсіз бе! Менің тапсырысым:\n\n"
    cart.forEach((item, index) => {
      textMessage += `${index + 1}) ${item.brand ? item.brand + ' ' : ''}${item.name} (${item.volume} мл) - ${item.quantity} дана x ${item.price.toLocaleString('kk-KZ')} ₸\n`
    })
    textMessage += `\n*Жалпы сомасы: ${cartTotal.toLocaleString('kk-KZ')} ₸*\n\nОсылар бар ма?`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  // Тікелей 1 парфюмді WhatsApp-қа жіберу (Модалка үшін)
  const getSingleWhatsAppUrl = (perfume) => {
    const phoneNumber = "7054298068"
    const textMessage = `Сәлеметсіз бе! Маған мына парфюм ұнады:\n\n*Бренд:* ${perfume.brand || 'Көрсетілмеген'}\n*Атауы:* ${perfume.name}\n*Көлемі:* ${perfume.volume} мл\n*Бағасы:* ${perfume.price.toLocaleString('kk-KZ')} ₸\n\nТапсырыс бергім келеді.`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  const availableVolumes = [...new Set(perfumes.map(p => p.volume))].sort((a, b) => a - b)
  const availableBrands = [...new Set(perfumes.map(p => p.brand).filter(Boolean))]

  const filteredPerfumes = perfumes.filter(perfume => {
    const matchesSearch = perfume.name.toLowerCase().includes(searchQuery.toLowerCase())
    let matchesPrice = true
    if (priceFilter === 'budget') matchesPrice = perfume.price <= 50000
    if (priceFilter === 'medium') matchesPrice = perfume.price > 50000 && perfume.price <= 100000
    if (priceFilter === 'premium') matchesPrice = perfume.price > 100000
    let matchesVolume = true
    if (volumeFilter !== 'all') matchesVolume = perfume.volume === parseInt(volumeFilter)
    let matchesBrand = true
    if (brandFilter !== 'all') matchesBrand = perfume.brand === brandFilter
    return matchesSearch && matchesPrice && matchesVolume && matchesBrand
  })

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-gray-50 relative">
      {/* Navbar-ға себеттің санын және ашу функциясын береміз */}
      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />
      
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full mt-4 sm:mt-8 flex flex-col gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
          <h1 className="text-2xl sm:text-3xl font-black">Каталог <span className="text-sm text-gray-500 font-medium ml-2">({filteredPerfumes.length})</span></h1>
          <div className="flex flex-col gap-4">
            
            {availableBrands.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Бренд:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setBrandFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${brandFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>Барлығы</button>
                  {availableBrands.map(brand => (
                    <button key={brand} onClick={() => setBrandFilter(brand)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${brandFilter === brand ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{brand}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Бағасы:</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setPriceFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-medium ${priceFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>Барлығы</button>
                <button onClick={() => setPriceFilter('budget')} className={`px-4 py-2 rounded-xl text-sm font-medium ${priceFilter === 'budget' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>50k дейін</button>
                <button onClick={() => setPriceFilter('medium')} className={`px-4 py-2 rounded-xl text-sm font-medium ${priceFilter === 'medium' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>50k - 100k</button>
                <button onClick={() => setPriceFilter('premium')} className={`px-4 py-2 rounded-xl text-sm font-medium ${priceFilter === 'premium' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>Премиум</button>
              </div>
            </div>
            
            {availableVolumes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Көлемі:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setVolumeFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-medium ${volumeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'}`}>Кез келген</button>
                  {availableVolumes.map(vol => (
                    <button key={vol} onClick={() => setVolumeFilter(vol)} className={`px-4 py-2 rounded-xl text-sm font-medium ${volumeFilter === vol ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'}`}>{vol} мл</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-20 text-gray-500">Жүктелуде...</div>
          ) : filteredPerfumes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">Ештеңе табылмады</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {filteredPerfumes.map(perfume => (
                <PerfumeCard 
                  key={perfume.id} 
                  perfume={perfume} 
                  onClick={() => setSelectedPerfume(perfume)} 
                  onAddToCart={addToCart} // Себетке қосу функциясын береміз
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ТОЛЫҚ АҚПАРАТ МОДАЛКАСЫ */}
      {selectedPerfume && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col sm:flex-row shadow-2xl relative">
            <button onClick={() => setSelectedPerfume(null)} className="absolute top-4 right-4 bg-white/80 backdrop-blur shadow p-2 rounded-full hover:bg-gray-100 z-10 text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="w-full sm:w-1/2 bg-gray-50 aspect-square sm:aspect-auto">
              <img src={selectedPerfume.image_url} alt={selectedPerfume.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full sm:w-1/2 p-6 sm:p-10 flex flex-col">
              {selectedPerfume.brand && (
                <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-2">{selectedPerfume.brand}</p>
              )}
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{selectedPerfume.name}</h2>
              <p className="text-gray-500 mb-6 font-medium">{selectedPerfume.volume} мл</p>
              <p className="text-3xl font-black text-indigo-600 mb-8">{selectedPerfume.price.toLocaleString('kk-KZ')} ₸</p>
              <div className="mb-8">
                <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-sm">Сипаттамасы:</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedPerfume.description || "Бұл парфюмге әзірге толық сипаттама жазылмаған."}
                </p>
              </div>
              
              {/* Модалкадағы 2 батырма: Себетке қосу ЖӘНЕ Тікелей алу */}
              <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => { addToCart(selectedPerfume); setSelectedPerfume(null); }}
                  className="w-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm sm:text-base font-bold py-4 rounded-xl transition-all"
                >
                  Себетке қосу
                </button>
                <a 
                  href={getSingleWhatsAppUrl(selectedPerfume)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-1/2 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm sm:text-base font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-md gap-2"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ЖАҢА: СЕБЕТ ТЕРЕЗЕСІ (Оң жақтан шығады) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-[70]">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                Себет <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-500">{cart.length}</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 rounded-full p-2 hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  <p>Себетіңіз әзірге бос</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-4">
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-gray-50" />
                    <div className="flex-1">
                      {item.brand && <p className="text-[10px] text-indigo-500 font-bold uppercase">{item.brand}</p>}
                      <h4 className="font-bold text-gray-900 leading-tight">{item.name}</h4>
                      <p className="text-sm text-gray-500 mb-2">{item.price.toLocaleString('kk-KZ')} ₸</p>
                      
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQuantity(item.id, -1)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors">-</button>
                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500 hover:text-red-700 text-sm font-bold transition-colors">Өшіру</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500">Жалпы сома:</span>
                  <span className="text-2xl font-black text-indigo-600">{cartTotal.toLocaleString('kk-KZ')} ₸</span>
                </div>
                <a 
                  href={getCartWhatsAppUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-lg gap-2"
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Тапсырыс беру
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}