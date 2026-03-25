import { Search } from 'lucide-react'

export default function Navbar({ searchQuery, setSearchQuery, cartCount, onOpenCart }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center py-3 sm:h-16 gap-3 sm:gap-0">
          
          <div className="flex-shrink-0 w-full sm:w-auto text-center sm:text-left">
            <span className="text-2xl font-black tracking-tighter text-gray-900">
              AURA<span className="text-indigo-600">.</span>
            </span>
          </div>

          <div className="w-full sm:max-w-md sm:ml-8 flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all"
                placeholder="Парфюм іздеу..."
              />
            </div>

            {/* ЖАҢА: Себет батырмасы */}
            <button 
              onClick={onOpenCart} 
              className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </nav>
  )
}