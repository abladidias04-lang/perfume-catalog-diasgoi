export default function PerfumeCard({ perfume, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        <img src={perfume.image_url} alt={perfume.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* ЖАҢА: Бренд аты көрсетіледі */}
        {perfume.brand && (
          <p className="text-[10px] sm:text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">
            {perfume.brand}
          </p>
        )}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{perfume.name}</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-2">{perfume.volume} мл</p>
        <div className="mt-auto">
          <p className="text-lg sm:text-xl font-black text-indigo-600">{perfume.price.toLocaleString('kk-KZ')} ₸</p>
        </div>
      </div>
    </div>
  )
}