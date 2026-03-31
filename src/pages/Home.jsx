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
  const [genderFilter, setGenderFilter] = useState('all')
  
  // Баға түрі
  const [priceType, setPriceType] = useState('retail')
  
  const [sortBy, setSortBy] = useState('alphabetical')
  const [isFilterMobileOpen, setIsFilterMobileOpen] = useState(false)
  const [selectedPerfume, setSelectedPerfume] = useState(null)
  
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('aura_cart')
    return savedCart ? JSON.parse(savedCart) : []
  })
  
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)

  const [lang, setLang] = useState('kz')
  const t = translations[lang]

  useEffect(() => {
    localStorage.setItem('aura_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => { fetchPerfumes() }, [])

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, selectedBrands, selectedVolumes, priceFilter, genderFilter, sortBy, priceType])

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

  const getDisplayPrice = (basePrice) => priceType === 'retail' ? basePrice + 3000 : basePrice;

  const cartTotal = cart.reduce((sum, item) => sum + (getDisplayPrice(item.price) * item.quantity), 0)

  const getCartWhatsAppUrl = () => {
    const phoneNumber = "7029858210"
    const orderType = priceType === 'retail' ? "(В розницу)" : "(Оптом)"
    let textMessage = lang === 'kz' ? `Сәлеметсіз бе! Менің тапсырысым ${orderType}:\n\n` : `Здравствуйте! Мой заказ ${orderType}:\n\n`
    
    cart.forEach((item, index) => {
      textMessage += `${index + 1}) ${item.brand ? item.brand + ' ' : ''}${item.name} (${item.volume} мл) - ${item.quantity} шт x ${getDisplayPrice(item.price).toLocaleString('kk-KZ')} ₸\n`
    })
    textMessage += `\n*${t.total} ${cartTotal.toLocaleString('kk-KZ')} ₸*\n\n`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  const getSingleWhatsAppUrl = (perfume) => {
    const phoneNumber = "7029858210"
    const orderType = priceType === 'retail' ? "(В розницу)" : "(Оптом)"
    const textMessage = lang === 'kz' 
      ? `Сәлеметсіз бе! Маған мына парфюм ұнады ${orderType}:\n\n*Бренд:* ${perfume.brand || '-'}\n*Атауы:* ${perfume.name}\n*Көлемі:* ${perfume.volume} мл\n*Бағасы:* ${getDisplayPrice(perfume.price).toLocaleString('kk-KZ')} ₸\n\nТапсырыс бергім келеді.`
      : `Здравствуйте! Мне понравился этот парфюм ${orderType}:\n\n*Бренд:* ${perfume.brand || '-'}\n*Название:* ${perfume.name}\n*Объем:* ${perfume.volume} мл\n*Цена:* ${getDisplayPrice(perfume.price).toLocaleString('kk-KZ')} ₸\n\nХочу сделать заказ.`
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`
  }

  const availableVolumes = [...new Set(perfumes.map(p => p.volume))].sort((a, b) => a - b)
  
  const brandMap = new Map();
  perfumes.forEach(p => {
    if (p.brand) {
      const cleanBrand = p.brand.trim();
      const lowerBrand = cleanBrand.toLowerCase();
      if (!brandMap.has(lowerBrand)) {
        brandMap.set(lowerBrand, cleanBrand);
      }
    }
  });
  const availableBrands = Array.from(brandMap.values()).sort((a, b) => a.localeCompare(b));

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
    const searchableText = `${perfume.brand || ''} ${perfume.name || ''} ${perfume.description || ''} ${perfume.gender || ''}`.toLowerCase()
    const matchesSearch = searchTerms.every(term => searchableText.includes(term))
    
    let matchesGender = true
    if (genderFilter !== 'all') matchesGender = perfume.gender === genderFilter

    let matchesPrice = true
    const currentPrice = getDisplayPrice(perfume.price)
    if (priceFilter === 'range1') matchesPrice = currentPrice >= 7000 && currentPrice <= 9800
    if (priceFilter === 'range2') matchesPrice = currentPrice >= 9800 && currentPrice <= 13600
    if (priceFilter === 'range3') matchesPrice = currentPrice >= 15400 && currentPrice <= 21500
    
    let matchesVolume = true
    if (selectedVolumes.length > 0) matchesVolume = selectedVolumes.includes(perfume.volume)
    
    let matchesBrand = true
    if (selectedBrands.length > 0) {
      const lowerSelectedBrands = selectedBrands.map(b => b.toLowerCase());
      matchesBrand = perfume.brand && lowerSelectedBrands.includes(perfume.brand.trim().toLowerCase());
    }
    
    return matchesSearch && matchesPrice && matchesVolume && matchesBrand && matchesGender
  })

  const sortedPerfumes = [...filteredPerfumes].sort((a, b) => {
    const priceA = getDisplayPrice(a.price);
    const priceB = getDisplayPrice(b.price);
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    return nameA.localeCompare(nameB);
  })

  const displayedPerfumes = sortedPerfumes.slice(0, visibleCount)

  const similarPerfumes = selectedPerfume 
    ? perfumes.filter(p => p.brand === selectedPerfume.brand && p.id !== selectedPerfume.id).slice(0, 3)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] relative">
      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        lang={lang}
        setLang={setLang}
      />
      
      {/* ПРЕМИУМ HEADER БЛОГЫ (Оптом / Розница осында) */}
      <div className="bg-white border-b border-gray-100 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center relative overflow-hidden">
          
          {/* Әдемі фондық эффект (Blob) */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-50 rounded-full blur-3xl opacity-60 -ml-10 -mb-10 pointer-events-none"></div>

          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mb-6 sm:mb-8 text-center relative z-10">
            {t.catalog} <span className="text-indigo-600 opacity-80 text-2xl sm:text-4xl">({sortedPerfumes.length})</span>
          </h1>

          {/* ЖАҢАРТЫЛҒАН, СӘНДІ (СЫРҒИТЫН) ТАҢДАУ (Segmented Control) */}
          <div className="relative inline-flex bg-gray-100/80 backdrop-blur-md p-1.5 rounded-full shadow-inner border border-gray-200/60 w-full sm:w-auto max-w-[400px] z-10">
            {/* Ақ сырғанау фоны (Анимация) */}
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out ${priceType === 'retail' ? 'translate-x-0' : 'translate-x-[calc(100%+0px)]'}`}
            ></div>
            
            <button
              onClick={() => setPriceType('retail')}
              className={`relative z-10 flex-1 px-4 sm:px-8 py-3 text-sm sm:text-base font-bold rounded-full transition-colors duration-300 ${priceType === 'retail' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.retail}
            </button>
            <button
              onClick={() => setPriceType('wholesale')}
              className={`relative z-10 flex-1 px-4 sm:px-8 py-3 text-sm sm:text-base font-bold rounded-full transition-colors duration-300 ${priceType === 'wholesale' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.wholesale}
            </button>
          </div>

        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6 sm:mt-10 mb-16 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
        
        {/* МОБИЛЬДІ ФИЛЬТР / СҰРЫПТАУ ПАНЕЛІ */}
        <div className="w-full md:hidden flex justify-between items-center bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100">
          <button 
            onClick={() => setIsFilterMobileOpen(true)}
            className="flex flex-1 justify-center items-center gap-2 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            {lang === 'kz' ? 'Фильтрлер' : 'Фильтры'}
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
          </button>
          <div className="w-px h-8 bg-gray-100 mx-2"></div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 bg-transparent text-gray-700 text-sm font-bold block p-3 outline-none cursor-pointer text-center appearance-none"
            style={{ textAlignLast: 'center' }}
          >
            <option value="alphabetical">{t.sortAlphabetical}</option>
            <option value="price-asc">{t.sortCheap}</option>
            <option value="price-desc">{t.sortExpensive}</option>
          </select>
        </div>

        {/* SIDEBAR ФИЛЬТР */}
        <aside className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:static md:z-auto w-full md:w-64 lg:w-72 flex-shrink-0 transition-opacity ${isFilterMobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible md:opacity-100 md:visible'}`}>
          <div className={`h-full md:h-auto overflow-y-auto bg-white md:rounded-3xl shadow-2xl md:shadow-sm border-0 md:border border-gray-100 p-6 flex flex-col gap-8 md:sticky md:top-28 transition-transform duration-300 w-[85%] md:w-full ml-auto md:ml-0 ${isFilterMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
            
            <div className="flex justify-between items-center md:hidden mb-2">
              <h2 className="text-2xl font-black text-gray-900">{lang === 'kz' ? 'Фильтрлер' : 'Фильтры'}</h2>
              <button onClick={() => setIsFilterMobileOpen(false)} className="bg-gray-100 p-2.5 rounded-full hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm font-bold text-red-500 bg-red-50 py-3 px-4 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                {lang === 'kz' ? 'Сүзгіні тазарту' : 'Сбросить фильтры'}
              </button>
            )}

            <div>
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">{t.gender}</h3>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'all', label: t.all },
                  { id: 'Мужской', label: t.men },
                  { id: 'Женский', label: t.women },
                  { id: 'Унисекс', label: t.unisex }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3.5 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="gender"
                        checked={genderFilter === opt.id}
                        onChange={() => setGenderFilter(opt.id)}
                        className="w-5 h-5 border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                      />
                    </div>
                    <span className={`text-sm transition-colors ${genderFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50"></div>

            {availableBrands.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">{t.brand}</h3>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {availableBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-3.5 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                      <span className={`text-sm transition-colors ${selectedBrands.includes(brand) ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50"></div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">{t.price}</h3>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'all', label: t.all },
                  { id: 'range1', label: t.range1 },
                  { id: 'range2', label: t.range2 },
                  { id: 'range3', label: t.range3 }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3.5 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="price"
                      checked={priceFilter === opt.id}
                      onChange={() => setPriceFilter(opt.id)}
                      className="w-5 h-5 border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`text-sm transition-colors ${priceFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50"></div>

            {availableVolumes.length > 0 && (
              <div className="pb-8 md:pb-0">
                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">{t.volume}</h3>
                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {availableVolumes.map(vol => (
                    <label key={vol} className="flex items-center gap-3.5 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedVolumes.includes(vol)}
                        onChange={() => toggleVolume(vol)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-sm transition-colors ${selectedVolumes.includes(vol) ? 'font-bold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{vol} мл</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="md:hidden sticky bottom-0 left-0 right-0 bg-white pt-4 pb-2 border-t border-gray-100 mt-auto">
               <button onClick={() => setIsFilterMobileOpen(false)} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95">
                 {lang === 'kz' ? `Көрсету (${sortedPerfumes.length})` : `Показать (${sortedPerfumes.length})`}
               </button>
            </div>
          </div>
        </aside>

        {/* НЕГІЗГІ КАТАЛОГ БӨЛІМІ */}
        <div className="flex-1 w-full">
          <div className="hidden md:flex justify-end mb-6">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-900 text-sm font-bold outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="alphabetical">{t.sortAlphabetical}</option>
                <option value="price-asc">{t.sortCheap}</option>
                <option value="price-desc">{t.sortExpensive}</option>
              </select>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full animate-pulse p-4">
                    <div className="aspect-[4/5] bg-gray-100 rounded-2xl mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-1/3 mb-3"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded-full w-1/4 mb-6"></div>
                    <div className="mt-auto h-8 bg-gray-200 rounded-full w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : sortedPerfumes.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.empty}</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">Кешіріңіз, сіз іздеген шарттар бойынша ештеңе табылмады.</p>
                <button onClick={clearFilters} className="bg-gray-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-gray-800 transition-colors shadow-md">
                  {lang === 'kz' ? 'Сүзгілерді тазарту' : 'Сбросить фильтры'}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {displayedPerfumes.map(perfume => (
                    <PerfumeCard key={perfume.id} perfume={perfume} priceType={priceType} onClick={() => setSelectedPerfume(perfume)} />
                  ))}
                </div>

                {visibleCount < sortedPerfumes.length && (
                  <div className="mt-12 flex justify-center">
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="bg-white border-2 border-gray-200 text-gray-900 font-black py-4 px-10 rounded-full hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300 shadow-sm"
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

      {/* FOOTER */}
      <footer className="w-full bg-[#0a0a0a] py-12 rounded-t-[40px] sm:rounded-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <p className="text-white/50 text-xs sm:text-sm font-bold uppercase tracking-widest mb-8">{lang === 'kz' ? 'Бізге жазылыңыз' : 'Подпишитесь на нас'}</p>
          <div className="flex justify-center items-center gap-6 sm:gap-8">
            
            <a href="https://www.tiktok.com/@gulnaz_inayatulla11?_r=1&_t=ZS-952JB5e1aML" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 hover:scale-110">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
            </a>
            
            <a href="https://wa.me/77029858210" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-[#25D366] transition-all duration-300 hover:scale-110">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            
            <a href="https://www.instagram.com/gulnaz_inayatulla?igsh=ZmllemsyOGsyOXF4&utm_source=qr" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-[#E1306C] transition-all duration-300 hover:scale-110">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            
            <a href="https://t.me/+iVy6dNcKUrlhMjgy" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-[#0088cc] transition-all duration-300 hover:scale-110">
              <svg className="w-5 h-5 ml-[-2px] mt-[2px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.896-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
            
          </div>
          <p className="mt-8 text-white/30 text-[10px] font-medium tracking-wide">AURA PARFUM © 2024</p>
        </div>
      </footer>

      {/* МОДАЛЬДЫ ТЕРЕЗЕ */}
      {selectedPerfume && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-[60] p-0 sm:p-4 transition-all">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col sm:flex-row shadow-2xl relative">
            <button onClick={() => setSelectedPerfume(null)} className="absolute top-4 right-4 bg-white/90 backdrop-blur-md shadow-sm p-2.5 rounded-full hover:bg-gray-100 z-10 text-gray-900 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="w-full sm:w-1/2 bg-[#F8F9FA] aspect-square sm:aspect-auto">
              <img src={selectedPerfume.image_url} alt={selectedPerfume.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full sm:w-1/2 p-6 sm:p-10 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                {selectedPerfume.brand && <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{selectedPerfume.brand}</p>}
                {selectedPerfume.gender && <span className="bg-gray-100 text-gray-600 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">{selectedPerfume.gender}</span>}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 leading-tight">{selectedPerfume.name}</h2>
              <p className="text-gray-500 mb-6 font-bold">{selectedPerfume.volume} мл</p>
              
              <p className="text-4xl font-black text-indigo-600 mb-8">{getDisplayPrice(selectedPerfume.price).toLocaleString('kk-KZ')} ₸</p>
              
              <div className="mb-8">
                <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs opacity-70">{t.description}</h4>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{selectedPerfume.description || t.empty}</p>
              </div>
              
              {similarPerfumes.length > 0 && (
                <div className="mb-10">
                  <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs opacity-70">{t.similarProducts}</h4>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {similarPerfumes.map(sim => (
                      <div 
                        key={sim.id} 
                        onClick={() => setSelectedPerfume(sim)} 
                        className="cursor-pointer group flex flex-col"
                      >
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-50 mb-2 shadow-sm border border-gray-100">
                          <img src={sim.image_url} alt={sim.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate mb-0.5">{sim.name}</p>
                        <p className="text-[11px] text-indigo-600 font-bold">{getDisplayPrice(sim.price).toLocaleString('kk-KZ')} ₸</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                <button onClick={() => { addToCart(selectedPerfume); setSelectedPerfume(null); }} className="w-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm sm:text-base font-bold py-4 rounded-2xl transition-colors">
                  {t.addToCart}
                </button>
                <a href={getSingleWhatsAppUrl(selectedPerfume)} target="_blank" rel="noopener noreferrer" className="w-1/2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm sm:text-base font-bold py-4 rounded-2xl flex items-center justify-center transition-colors shadow-sm gap-2">
                  {t.buyWhatsApp}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* СЕБЕТ */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-[70] transition-opacity">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex justify-between items-center p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                {t.cartTitle} <span className="text-sm bg-indigo-100 px-3 py-1 rounded-full text-indigo-600">{cart.length}</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-white shadow-sm border border-gray-100 rounded-full p-2.5 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 mt-32 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  </div>
                  <p className="font-bold text-lg text-gray-900 mb-2">{t.cartEmpty}</p>
                  <p className="text-sm">Каталогтан ұнаған парфюмді таңдаңыз</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6 group">
                    <div className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      {item.brand && <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1">{item.brand}</p>}
                      <h4 className="font-bold text-gray-900 leading-tight mb-1 pr-6">{item.name}</h4>
                      <p className="text-sm font-black text-indigo-600 mb-auto">{getDisplayPrice(item.price).toLocaleString('kk-KZ')} ₸</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm font-bold flex items-center justify-center transition-all">-</button>
                          <span className="font-black w-6 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm font-bold flex items-center justify-center transition-all">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-6 sm:p-8 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-10">
                <div className="flex justify-between items-end mb-6">
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">{t.total}</span>
                  <span className="text-3xl font-black text-gray-900">{cartTotal.toLocaleString('kk-KZ')} ₸</span>
                </div>
                <a href={getCartWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="w-full bg-gray-900 hover:bg-black text-white text-lg font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
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