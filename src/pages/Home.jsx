import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import PerfumeCard from '../components/PerfumeCard'
import { supabase } from '../lib/supabase'
import { translations } from '../translations'

export default function Home() {
  const [perfumes, setPerfumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedBrands, setSelectedBrands] = useState([])
  const [selectedVolumes, setSelectedVolumes] = useState([])
  const [priceFilter, setPriceFilter] = useState('all')
  
  // ЖАҢА: Жыныс фильтрі
  const [genderFilter, setGenderFilter] = useState('all')
  
  const [sortBy, setSortBy] = useState('alphabetical')
  const [isFilterMobileOpen, setIsFilterMobileOpen] = useState(false)
  const [selectedPerfume, setSelectedPerfume] = useState(null)
  
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)

  const [lang, setLang] = useState('kz')
  const t = translations[lang]

  useEffect(() => { fetchPerfumes() }, [])

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, selectedBrands, selectedVolumes, priceFilter, genderFilter, sortBy])

  async function fetchPerfumes() {
    const { data } = await supabase.from('perfumes').select('*').order('created_at', { ascending: false })
    if (data) setPerfumes(data)
    setLoading(false)
  }

  const addToCart = (perfume) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === perfume.id)
      if (existing) {
        return prev.map(item => item.id === perfume.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...perfume, quantity: 1 }]
    })
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id))
  
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

  const getCartWhatsAppUrl = () => {
    const phoneNumber = "7029858210"
    let textMessage = lang === 'kz' ? "Сәлеметсіз бе! Менің тапсырысым:\n\n" : "Здравствуйте! Мой заказ:\n\n"
    cart.forEach((item, index) => {
      textMessage += `${index + 1}) ${item.brand ? item.brand + ' ' : ''}${item.name} (${item.volume} мл) - ${item.quantity} шт x ${item.price.toLocaleString('kk-KZ')} ₸\n`
    })
    textMessage += `\n*${t.total} ${cartTotal.toLocaleString('kk-KZ')} ₸*\n\n`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  const getSingleWhatsAppUrl = (perfume) => {
    const phoneNumber = "7029858210"
    const textMessage = lang === 'kz' 
      ? `Сәлеметсіз бе! Маған мына парфюм ұнады:\n\n*Бренд:* ${perfume.brand || '-'}\n*Атауы:* ${perfume.name}\n*Көлемі:* ${perfume.volume} мл\n*Бағасы:* ${perfume.price.toLocaleString('kk-KZ')} ₸\n\nТапсырыс бергім келеді.`
      : `Здравствуйте! Мне понравился этот парфюм:\n\n*Бренд:* ${perfume.brand || '-'}\n*Название:* ${perfume.name}\n*Объем:* ${perfume.volume} мл\n*Цена:* ${perfume.price.toLocaleString('kk-KZ')} ₸\n\nХочу сделать заказ.`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  const availableVolumes = [...new Set(perfumes.map(p => p.volume))].sort((a, b) => a - b)
  const availableBrands = [...new Set(perfumes.map(p => p.brand).filter(Boolean))]

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand])
  }

  const toggleVolume = (vol) => {
    setSelectedVolumes(prev => prev.includes(vol) ? prev.filter(v => v !== vol) : [...prev, vol])
  }

  const clearFilters = () => {
    setSelectedBrands([])
    setSelectedVolumes([])
    setPriceFilter('all')
    setGenderFilter('all')
  }

  const hasActiveFilters = selectedBrands.length > 0 || selectedVolumes.length > 0 || priceFilter !== 'all' || genderFilter !== 'all'

  const filteredPerfumes = perfumes.filter(perfume => {
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean)
    // ЖАҢА: Іздеу мәтініне perfume.gender қосылды
    const searchableText = `${perfume.brand || ''} ${perfume.name || ''} ${perfume.description || ''} ${perfume.gender || ''}`.toLowerCase()
    const matchesSearch = searchTerms.every(term => searchableText.includes(term))
    
    // ЖАҢА: Жынысы бойынша фильтр
    let matchesGender = true
    if (genderFilter !== 'all') matchesGender = perfume.gender === genderFilter

    let matchesPrice = true
    if (priceFilter === 'range1') matchesPrice = perfume.price >= 7000 && perfume.price <= 9800
    if (priceFilter === 'range2') matchesPrice = perfume.price >= 9800 && perfume.price <= 13600
    if (priceFilter === 'range3') matchesPrice = perfume.price >= 15400 && perfume.price <= 21500
    
    let matchesVolume = true
    if (selectedVolumes.length > 0) matchesVolume = selectedVolumes.includes(perfume.volume)
    
    let matchesBrand = true
    if (selectedBrands.length > 0) matchesBrand = selectedBrands.includes(perfume.brand)
    
    return matchesSearch && matchesPrice && matchesVolume && matchesBrand && matchesGender
  })

  const sortedPerfumes = [...filteredPerfumes].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    return nameA.localeCompare(nameB);
  })

  const displayedPerfumes = sortedPerfumes.slice(0, visibleCount)

  const similarPerfumes = selectedPerfume 
    ? perfumes.filter(p => p.brand === selectedPerfume.brand && p.id !== selectedPerfume.id).slice(0, 3)
    : [];

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-gray-50 relative">
      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        lang={lang}
        setLang={setLang}
      />
      
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full mt-4 sm:mt-8 flex flex-col md:flex-row gap-6 items-start">
        
        <div className="w-full md:hidden flex flex-col gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black">{t.catalog} <span className="text-sm text-gray-500 font-medium ml-1">({sortedPerfumes.length})</span></h1>
            <button 
              onClick={() => setIsFilterMobileOpen(true)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              {lang === 'kz' ? 'Фильтр' : 'Фильтры'}
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block w-full p-2.5 outline-none font-medium"
          >
            <option value="alphabetical">{t.sortAlphabetical}</option>
            <option value="price-asc">{t.sortCheap}</option>
            <option value="price-desc">{t.sortExpensive}</option>
          </select>
        </div>

        <aside className={`fixed inset-0 z-50 bg-white md:bg-transparent md:static md:z-auto w-full md:w-64 flex-shrink-0 transition-transform ${isFilterMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="h-full md:h-auto overflow-y-auto bg-white md:rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-6 md:sticky md:top-24">
            
            <div className="flex justify-between items-center md:hidden mb-2">
              <h2 className="text-xl font-black">{lang === 'kz' ? 'Фильтрлер' : 'Фильтры'}</h2>
              <button onClick={() => setIsFilterMobileOpen(false)} className="bg-gray-100 p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm font-bold text-red-500 bg-red-50 py-2 rounded-lg hover:bg-red-100 transition-colors">
                {lang === 'kz' ? 'Сүзгіні тазарту' : 'Сбросить фильтры'}
              </button>
            )}

            {/* ЖАҢА: Жыныс бойынша фильтр */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">{t.gender}</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'all', label: t.all },
                  { id: 'Мужской', label: t.men },
                  { id: 'Женский', label: t.women },
                  { id: 'Унисекс', label: t.unisex }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gender"
                      checked={genderFilter === opt.id}
                      onChange={() => setGenderFilter(opt.id)}
                      className="w-4.5 h-4.5 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`text-sm ${genderFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {availableBrands.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">{t.brand}</h3>
                <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
                  {availableBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="w-4.5 h-4.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                      <span className={`text-sm ${selectedBrands.includes(brand) ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            <div>
              <h3 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">{t.price}</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'all', label: t.all },
                  { id: 'range1', label: t.range1 },
                  { id: 'range2', label: t.range2 },
                  { id: 'range3', label: t.range3 }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="price"
                      checked={priceFilter === opt.id}
                      onChange={() => setPriceFilter(opt.id)}
                      className="w-4.5 h-4.5 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`text-sm ${priceFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {availableVolumes.length > 0 && (
              <div className="pb-6 md:pb-0">
                <h3 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">{t.volume}</h3>
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {availableVolumes.map(vol => (
                    <label key={vol} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedVolumes.includes(vol)}
                        onChange={() => toggleVolume(vol)}
                        className="w-4.5 h-4.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-sm ${selectedVolumes.includes(vol) ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{vol} мл</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="md:hidden sticky bottom-0 left-0 right-0 bg-white pt-4 pb-2 border-t border-gray-100 mt-auto">
               <button onClick={() => setIsFilterMobileOpen(false)} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md">
                 {lang === 'kz' ? `Көрсету (${sortedPerfumes.length})` : `Показать (${sortedPerfumes.length})`}
               </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 w-full">
          <div className="hidden md:flex bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 justify-between items-center">
            <h1 className="text-2xl font-black">{t.catalog} <span className="text-sm text-gray-500 font-medium ml-2">({sortedPerfumes.length} {lang === 'kz' ? 'тауар' : 'товаров'})</span></h1>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">{lang === 'kz' ? 'Сұрыптау:' : 'Сортировка:'}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-medium cursor-pointer"
              >
                <option value="alphabetical">{t.sortAlphabetical}</option>
                <option value="price-asc">{t.sortCheap}</option>
                <option value="price-desc">{t.sortExpensive}</option>
              </select>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full animate-pulse">
                    <div className="aspect-[4/5] bg-gray-200"></div>
                    <div className="p-3 sm:p-4 flex flex-col flex-grow">
                      <div className="h-3 bg-gray-200 rounded-full w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded-full w-1/4 mb-4"></div>
                      <div className="mt-auto">
                        <div className="h-6 bg-gray-200 rounded-full w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedPerfumes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm font-medium text-gray-500">
                {t.empty} <br/> 
                <button onClick={clearFilters} className="mt-3 text-indigo-600 hover:underline font-bold">{lang === 'kz' ? 'Сүзгілерді тазарту' : 'Сбросить фильтры'}</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {displayedPerfumes.map(perfume => (
                    <PerfumeCard key={perfume.id} perfume={perfume} onClick={() => setSelectedPerfume(perfume)} />
                  ))}
                </div>

                {visibleCount < sortedPerfumes.length && (
                  <div className="mt-8 flex justify-center">
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="bg-white border border-gray-200 text-indigo-600 font-bold py-3.5 px-8 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      {t.loadMore}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* МОДАЛЬДЫ ТЕРЕЗЕ */}
      {selectedPerfume && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-[60] p-0 sm:p-4 transition-all">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col sm:flex-row shadow-2xl relative">
            <button onClick={() => setSelectedPerfume(null)} className="absolute top-4 right-4 bg-white/80 backdrop-blur shadow p-2 rounded-full hover:bg-gray-100 z-10 text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="w-full sm:w-1/2 bg-gray-50 aspect-square sm:aspect-auto">
              <img src={selectedPerfume.image_url} alt={selectedPerfume.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full sm:w-1/2 p-6 sm:p-10 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                {selectedPerfume.brand && <p className="text-sm font-black text-indigo-500 uppercase tracking-widest">{selectedPerfume.brand}</p>}
                {selectedPerfume.gender && <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-medium">{selectedPerfume.gender}</span>}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{selectedPerfume.name}</h2>
              <p className="text-gray-500 mb-6 font-medium">{selectedPerfume.volume} мл</p>
              <p className="text-3xl font-black text-indigo-600 mb-8">{selectedPerfume.price.toLocaleString('kk-KZ')} ₸</p>
              
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-sm">{t.description}</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedPerfume.description || t.empty}</p>
              </div>
              
              {similarPerfumes.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">{t.similarProducts}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {similarPerfumes.map(sim => (
                      <div 
                        key={sim.id} 
                        onClick={() => setSelectedPerfume(sim)} 
                        className="cursor-pointer group flex flex-col"
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-50 mb-2">
                          <img src={sim.image_url} alt={sim.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate">{sim.name}</p>
                        <p className="text-[10px] text-indigo-600 font-bold">{sim.price.toLocaleString('kk-KZ')} ₸</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                <button onClick={() => { addToCart(selectedPerfume); setSelectedPerfume(null); }} className="w-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm sm:text-base font-bold py-4 rounded-xl transition-all">
                  {t.addToCart}
                </button>
                <a href={getSingleWhatsAppUrl(selectedPerfume)} target="_blank" rel="noopener noreferrer" className="w-1/2 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm sm:text-base font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-md gap-2">
                  {t.buyWhatsApp}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* СЕБЕТ */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-[70]">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                {t.cartTitle} <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-500">{cart.length}</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 rounded-full p-2 hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  <p>{t.cartEmpty}</p>
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
                        <button onClick={() => updateQuantity(item.id, -1)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-lg font-bold flex items-center justify-center">-</button>
                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-lg font-bold flex items-center justify-center">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500 hover:text-red-700 text-sm font-bold">{t.delete}</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500">{t.total}</span>
                  <span className="text-2xl font-black text-indigo-600">{cartTotal.toLocaleString('kk-KZ')} ₸</span>
                </div>
                <a href={getCartWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-lg gap-2">
                  {t.checkout}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}