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
  
  // Админ панельдегі іздеу, фильтр және сұрыптау
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [sortBy, setSortBy] = useState('new'); // Жаңадан қосылған сұрыптау
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
        .select('id, name, brand, price, volume, gender, description, image_url')
        .order('id', { ascending: false });

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

  // 1. Алдымен тауарларды іздеу және фильтрлеу
  const filteredPerfumes = perfumes.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = filterGender === 'all' || item.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  // 2. Одан кейін таңдалған сұрыптау бойынша реттеу
  const sortedPerfumes = [...filteredPerfumes].sort((a, b) => {
    if (sortBy === 'new') return b.id - a.id;
    if (sortBy === 'old') return a.id - b.id;
    if (sortBy === 'az') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'za') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });

  // 3. Нәтижені пагинациямен (шектеп) шығару
  const displayedPerfumes = sortedPerfumes.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Админ Панель</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium">Шығу</button>
        </div>

        {/* Форма */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">{editId ? 'Парфюмді өңдеу' : 'Жаңа парфюм қосу'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Атауы</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Бренд</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Бағасы (₸)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Көлемі (мл)</label>
                <input type="number" name="volume" value={formData.volume} onChange={handleInputChange} required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Жынысы</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500">
                  <option value="Мужской">Мужской</option>
                  <option value="Женский">Женский</option>
                  <option value="Унисекс">Унисекс</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Сипаттамасы</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Сурет таңдау</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border p-2 rounded text-sm" />
              <p className="text-xs text-gray-500 mt-1">* Сурет автоматты түрде сапасы сақталып, жеңілдетіледі.</p>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={uploading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {uploading ? 'Жүктелуде...' : editId ? 'Жаңарту' : 'Қосу'}
              </button>
              {editId && (
                <button type="button" onClick={() => { setEditId(null); setFormData({ name: '', brand: '', price: '', volume: '', gender: 'Унисекс', description: '' }); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">
                  Бас тарту
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Тізім және Фильтрлер */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-700 whitespace-nowrap">Барлық тауарлар ({sortedPerfumes.length})</h2>
            
            {/* Іздеу, Фильтр және Сұрыптау блогы */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <input 
                type="text" 
                placeholder="Атауы немесе бренд..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select 
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full sm:w-36 border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Барлық жыныс</option>
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
                <option value="Унисекс">Унисекс</option>
              </select>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-40 border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="new">Ең жаңалары</option>
                <option value="old">Ескілері</option>
                <option value="az">А-Я (Атауы)</option>
                <option value="za">Я-А (Атауы)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Жүктелуде...</p>
          ) : displayedPerfumes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Тауар табылмады</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {displayedPerfumes.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 px-2 rounded transition-colors">
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-14 h-14 object-cover rounded shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">Суретсіз</div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-800 line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-indigo-600">{item.brand}</span> | {item.volume} мл | {item.price} ₸
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button onClick={() => handleEdit(item)} className="px-4 py-1.5 bg-yellow-400 text-yellow-900 rounded text-xs font-bold hover:bg-yellow-500 transition-colors">Өңдеу</button>
                    <button onClick={() => handleDelete(item.id)} className="px-4 py-1.5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-colors">Жою</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {visibleCount < sortedPerfumes.length && (
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
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
