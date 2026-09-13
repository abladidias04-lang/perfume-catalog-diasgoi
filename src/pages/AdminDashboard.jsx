import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Суретті қысу сәтсіз аяқталды'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [sortBy, setSortBy] = useState('new'); 
  const [visibleCount, setVisibleCount] = useState(20);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    volume: '',
    gender: 'Унисекс',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    checkUser();
    fetchPerfumes();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate('/admin');
  };

  const fetchPerfumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfumes')
        .select('id, name, brand, price, volume, gender, description, image_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPerfumes(data || []);
    } catch (error) {
      console.error('Деректерді жүктеу қатесі:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        const compressedBlob = await compressImage(imageFile);
        const fileName = `${Date.now()}_perfume.webp`;

        const { error: uploadError } = await supabase.storage
          .from('perfumes')
          .upload(fileName, compressedBlob, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('perfumes')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const perfumePayload = {
        name: formData.name,
        brand: formData.brand,
        price: parseFloat(formData.price),
        volume: parseInt(formData.volume),
        gender: formData.gender,
        description: formData.description,
        ...(imageUrl && { image_url: imageUrl }),
      };

      if (editId) {
        const { error } = await supabase.from('perfumes').update(perfumePayload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('perfumes').insert([perfumePayload]);
        if (error) throw error;
      }

      setFormData({ name: '', brand: '', price: '', volume: '', gender: 'Унисекс', description: '' });
      setImageFile(null);
      setEditId(null);
      fetchPerfumes();
      alert('Сәтті сақталды!');
    } catch (error) {
      alert(`Қате орын алды: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (perfume) => {
    setEditId(perfume.id);
    setFormData({
      name: perfume.name || '',
      brand: perfume.brand || '',
      price: perfume.price || '',
      volume: perfume.volume || '',
      gender: perfume.gender || 'Унисекс',
      description: perfume.description || '',
      image_url: perfume.image_url,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Бұл тауарды өшіргіңіз келе ме?')) {
      try {
        const { error } = await supabase.from('perfumes').delete().eq('id', id);
        if (error) throw error;
        setPerfumes(perfumes.filter((p) => p.id !== id));
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  // Фильтрлеу
  const filteredPerfumes = perfumes.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = filterGender === 'all' || item.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  // Сұрыптау
  const sortedPerfumes = [...filteredPerfumes].sort((a, b) => {
    if (sortBy === 'new') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'old') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'az') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'za') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });

  const displayedPerfumes = sortedPerfumes.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Басты тақырып */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Админ Панель</h1>
          <button 
            onClick={handleLogout} 
            className="px-5 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm font-bold transition-colors"
          >
            Шығу
          </button>
        </div>

        {/* Форма блогы */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-black text-gray-900 mb-6">
            {editId ? 'Парфюмді өңдеу' : 'Жаңа парфюм қосу'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Атауы</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Бренд</label>
                <input 
                  type="text" 
                  name="brand" 
                  value={formData.brand} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Бағасы (₸)</label>
                <input 
                  type="number" 
                  name="price" 
                  value={formData.price} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Көлемі (мл)</label>
                <input 
                  type="number" 
                  name="volume" 
                  value={formData.volume} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Жынысы</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange} 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium cursor-pointer"
                >
                  <option value="Мужской">Мужской</option>
                  <option value="Женский">Женский</option>
                  <option value="Унисекс">Унисекс</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Сипаттамасы</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                rows="3" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all font-medium"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Сурет таңдау</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:outline-none file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer" 
              />
              <p className="text-[11px] font-medium text-gray-500 mt-2">
                * Суреттің сапасы сақталып, көлемі автоматты түрде жеңілдетіледі.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={uploading} 
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-bold shadow-sm transition-all"
              >
                {uploading ? 'Жүктелуде...' : editId ? 'Жаңарту' : 'Қосу'}
              </button>
              {editId && (
                <button 
                  type="button" 
                  onClick={() => { setEditId(null); setFormData({ name: '', brand: '', price: '', volume: '', gender: 'Унисекс', description: '' }); }} 
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Бас тарту
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Тізім және Фильтрлер блогы */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5">
            <h2 className="text-xl font-black text-gray-900 whitespace-nowrap">
              Барлық тауарлар <span className="text-sm text-gray-500 font-medium ml-1">({sortedPerfumes.length})</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <input 
                type="text" 
                placeholder="Іздеу..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-medium transition-all"
              />
              <select 
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full sm:w-40 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-medium cursor-pointer transition-all"
              >
                <option value="all">Барлық жыныс</option>
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
                <option value="Унисекс">Унисекс</option>
              </select>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-44 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-medium cursor-pointer transition-all"
              >
                <option value="new">Ең жаңалары</option>
                <option value="old">Ескілері</option>
                <option value="az">А-Я (Атауы)</option>
                <option value="za">Я-А (Атауы)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 text-sm font-medium">Жүктелуде...</div>
          ) : displayedPerfumes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm font-medium">Тауар табылмады</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedPerfumes.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        loading="lazy" 
                        className="w-16 h-16 object-cover rounded-xl bg-gray-50 border border-gray-100" 
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                        Суретсіз
                      </div>
                    )}
                    <div>
                      {item.brand && (
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">
                          {item.brand}
                        </p>
                      )}
                      <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">
                        {item.volume} мл | {item.price.toLocaleString('kk-KZ')} ₸
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(item)} 
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      Өңдеу
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      Жою
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {visibleCount < sortedPerfumes.length && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-8 py-3.5 border border-gray-200 text-indigo-600 bg-white rounded-xl text-sm font-bold hover:bg-gray-50 shadow-sm transition-all"
              >
                Тағы көрсету...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
