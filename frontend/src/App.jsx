import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight, Heart, Home, LayoutDashboard, LogIn, LogOut, Menu, Package, PlusCircle, ShoppingBag, Sparkles, Store, User, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';
import api from './api';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const fallbackProducts = [
  { id: 1, name: 'Cơm gà sốt tiêu', price: 49000, description: 'Cơm nóng, gà mềm, sốt tiêu nhẹ dễ ăn.', category: 'Best seller', image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80' },
  { id: 2, name: 'Bún bò cay nhẹ', price: 56000, description: 'Bún bò đậm vị, cay rất nhẹ, hợp bữa trưa.', category: 'Popular', image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80' },
  { id: 3, name: 'Salad cá hồi', price: 72000, description: 'Salad tươi, cá hồi áp chảo, vị nhẹ nhàng.', category: 'Healthy', image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80' },
  { id: 4, name: 'Mì Ý sốt bò', price: 65000, description: 'Mì Ý sốt bò băm, thơm và vừa miệng.', category: 'Comfort', image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80' },
];

function App() {
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [authState, setAuthState] = useState({ token: localStorage.getItem('access_token'), user: null, loading: true });

  const showToast = (message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 3000);
  };

  const refreshMe = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAuthState({ token: null, user: null, loading: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setAuthState({ token, user: data, loading: false });
    } catch {
      localStorage.removeItem('access_token');
      setAuthState({ token: null, user: null, loading: false });
    }
  };

  useEffect(() => { refreshMe(); }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!authState.token) {
        setNotifications([]);
        return;
      }
      try {
        const { data } = await api.get('/notifications');
        setNotifications(Array.isArray(data) ? data.map((item) => ({ ...item, read: item.status === 'read' })) : []);
      } catch {
        setNotifications([]);
      }
    };
    loadNotifications();
  }, [authState.token]);

  const auth = useMemo(() => ({
    ...authState,
    login: async (token) => {
      localStorage.setItem('access_token', token);
      setAuthState((prev) => ({ ...prev, token, loading: false }));
      try {
        const { data } = await api.get('/auth/me');
        setAuthState((prev) => ({ ...prev, token, user: data, loading: false }));
      } catch {
        setAuthState((prev) => ({ ...prev, token, user: null, loading: false }));
      }
    },
    logout: () => {
      localStorage.removeItem('access_token');
      setAuthState({ token: null, user: null, loading: false });
    },
  }), [authState]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f5_0%,#fffdfb_38%,#fffefe_100%)] text-slate-800">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_60%)]" />
      <Header auth={auth} notifications={notifications} setNotifications={setNotifications} showToast={showToast} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage auth={auth} />} />
          <Route path="/login" element={<LoginPage auth={auth} showToast={showToast} />} />
          <Route path="/register" element={<RegisterPage showToast={showToast} />} />
          <Route path="/products" element={<ProductsPage showToast={showToast} />} />
          <Route path="/products/:id" element={<ProductDetailPage auth={auth} showToast={showToast} addNotification={setNotifications} />} />
          <Route path="/orders" element={<OrdersPage auth={auth} showToast={showToast} />} />
          <Route path="/admin" element={<AdminGuard auth={auth}><AdminLayout auth={auth} showToast={showToast} /></AdminGuard>} />
          <Route path="/admin/*" element={<AdminGuard auth={auth}><AdminLayout auth={auth} showToast={showToast} /></AdminGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ToastStack toast={toast} />
    </div>
  );
}

function AdminGuard({ auth, children }) {
  const isAdmin = (auth.user?.role || '').toLowerCase() === 'admin';
  if (!auth.token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Header({ auth, notifications, setNotifications, showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const isAdmin = (auth.user?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    const onClick = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const navItems = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/products', label: 'Sản phẩm', icon: Store },
    { to: '/orders', label: 'Đơn hàng', icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-[0_12px_30px_rgba(249,115,22,0.22)]"><Sparkles size={20} /></div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">FoodFlow</div>
            <div className="text-xs text-slate-500">Microservice demo</div>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => <NavButton key={item.to} {...item} active={location.pathname === item.to} />)}
          {isAdmin && <NavButton to="/admin" label="Admin" icon={LayoutDashboard} active={location.pathname.startsWith('/admin')} />}
        </nav>

        <div className="flex items-center gap-2">
          <div ref={bellRef} className="relative">
            <button onClick={() => setBellOpen((v) => !v)} className="relative rounded-2xl border border-stone-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
              <Bell size={18} />
              {notifications.some((n) => !n.read) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-500" />}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] animate-fadeUp">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <div><div className="font-semibold text-slate-900">Thông báo</div><div className="text-xs text-slate-500">Cập nhật đơn hàng, sự kiện hệ thống</div></div>
                  <button onClick={() => setNotifications([])} className="text-xs font-medium text-brand-700 transition hover:text-brand-800">Xóa hết</button>
                </div>
                <div className="max-h-80 overflow-auto p-3">
                  {notifications.length === 0 ? <EmptyState title="Chưa có thông báo" description="Các sự kiện mới sẽ xuất hiện tại đây." /> : <div className="space-y-2">{notifications.map((item) => <NotificationItem key={item.id} item={item} />)}</div>}
                </div>
              </div>
            )}
          </div>

          {auth.token ? (
            <button onClick={() => { auth.logout(); showToast('Đã đăng xuất', 'info'); navigate('/login'); }} className="hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft sm:flex"><LogOut size={16} /> Đăng xuất</button>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <TopAction to="/login" icon={LogIn} label="Đăng nhập" secondary />
              <TopAction to="/register" icon={UserPlus} label="Đăng ký" />
            </div>
          )}

          <button className="rounded-2xl border border-stone-200 bg-white p-3 text-slate-700 md:hidden" onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200 bg-white px-4 py-3 md:hidden">
          <div className="space-y-2">
            {navItems.map((item) => <MobileNav key={item.to} {...item} onClick={() => setMenuOpen(false)} />)}
            {isAdmin && <MobileNav to="/admin" label="Admin" icon={LayoutDashboard} onClick={() => setMenuOpen(false)} />}
            {!auth.token && <><MobileNav to="/login" label="Đăng nhập" icon={LogIn} onClick={() => setMenuOpen(false)} /><MobileNav to="/register" label="Đăng ký" icon={UserPlus} onClick={() => setMenuOpen(false)} /></>}
          </div>
        </div>
      )}
    </header>
  );
}

function NavButton({ to, label, icon: Icon, active = false }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)} className={clsx('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition', active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900')}><Icon size={16} /> {label}</button>;
}

function MobileNav({ to, label, icon: Icon, onClick }) {
  const navigate = useNavigate();
  return <button onClick={() => { onClick?.(); navigate(to); }} className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-white"><Icon size={16} /> {label}</button>;
}

function TopAction({ to, label, icon: Icon, secondary = false }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)} className={clsx('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5', secondary ? 'border border-stone-200 bg-white text-slate-700 hover:shadow-soft' : 'bg-brand-600 text-white hover:bg-brand-700')}><Icon size={16} /> {label}</button>;
}

function HomePage({ auth }) {
  const featuredProducts = fallbackProducts.slice(0, 3);
  return (
    <div className="grid gap-8 animate-fadeUp">
      <section className="overflow-hidden rounded-[2.25rem] border border-stone-200 bg-white shadow-soft">
        <div className="grid gap-8 p-7 lg:grid-cols-[1.12fr_0.88fr] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-medium text-brand-800"><Sparkles size={16} /> Đặt món ngon mỗi ngày</div>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Đồ ăn ngon, giao diện đẹp, đặt hàng nhanh và nhận thông báo tức thì.</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">FoodFlow là trang đặt đồ ăn demo với trải nghiệm mượt, tone đỏ cam nhẹ, bố cục rõ ràng và chỉn chu. Bạn có thể xem sản phẩm nổi bật, xem chi tiết món, đặt đơn, theo dõi thông báo và kiểm tra toàn bộ luồng microservice.</p>
            <div className="mt-7 flex flex-wrap gap-3"><PrimaryButton to="/products" label="Xem món nổi bật" /><SecondaryButton to={auth.token ? '/orders' : '/login'} label={auth.token ? 'Đến đơn hàng' : 'Đăng nhập ngay'} /></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3"><MiniFeature title="Giao hàng nhanh" desc="Đặt món chỉ trong vài thao tác." /><MiniFeature title="Món tươi, rõ giá" desc="Thông tin món ăn trực quan, dễ chọn." /><MiniFeature title="Thông báo tức thì" desc="Theo dõi trạng thái đơn hàng liên tục." /></div>
          </div>
          <div className="grid gap-4"><HeroCard title="Cam kết của chúng tôi" items={['Món ăn trình bày rõ ràng, dễ chọn', 'Giá hiển thị minh bạch, dễ theo dõi', 'Đặt hàng nhanh, thông báo rõ ràng']} /><HeroCard title="Điểm nổi bật" items={['Giao diện tối giản nhưng hiện đại', 'Animation nhẹ tạo cảm giác mượt', 'Phù hợp demo và thuyết trình']} /></div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft">
          <div className="mb-4"><div className="text-sm font-semibold text-brand-700">Món nổi bật hôm nay</div><p className="mt-1 text-sm text-slate-500">Một vài món bán chạy để khách dễ bắt đầu</p></div>
          <div className="grid gap-4">{featuredProducts.map((product) => <button key={product.id} onClick={() => {}} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white"><img src={product.image_url} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{product.name}</div><div className="mt-1 line-clamp-1 text-sm text-slate-500">{product.description}</div></div><div className="text-sm font-semibold text-brand-700">{currency.format(product.price)}</div></button>)}</div>
        </div>
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft">
          <div className="mb-4"><div className="text-sm font-semibold text-brand-700">Quy trình đặt món</div><p className="mt-1 text-sm text-slate-500">Rất đơn giản, phù hợp để khách trải nghiệm nhanh</p></div>
          <div className="grid gap-4 md:grid-cols-3"><ProcessStep number="01" title="Chọn món" desc="Xem danh sách sản phẩm và mở chi tiết món." /><ProcessStep number="02" title="Đặt hàng" desc="Nhập số lượng và gửi đơn trong vài giây." /><ProcessStep number="03" title="Nhận thông báo" desc="Theo dõi trạng thái đơn qua popup và toast." /></div>
        </div>
      </section>
    </div>
  );
}

function MiniFeature({ title, desc }) { return <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"><div className="text-sm font-semibold text-brand-700">{title}</div><div className="mt-1 text-sm leading-6 text-slate-600">{desc}</div></div>; }
function HeroCard({ title, items }) { return <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><div className="text-lg font-semibold text-slate-900">{title}</div><div className="text-sm text-slate-500">Tối ưu cho trải nghiệm người dùng</div></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Heart size={18} /></div></div><div className="space-y-3">{items.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700"><span className="h-2 w-2 rounded-full bg-brand-500" /> {item}</div>)}</div></div>; }
function ProcessStep({ number, title, desc }) { return <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5"><div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{number}</div><div className="mt-4 text-lg font-semibold text-slate-900">{title}</div><div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div></div>; }

function LoginPage({ auth, showToast }) { const navigate = useNavigate(); const [form, setForm] = useState({ username: '', password: '' }); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setLoading(true); try { const body = new URLSearchParams({ username: form.username, password: form.password }); const { data } = await api.post('/auth/login', body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); await auth.login(data.access_token); showToast('Đăng nhập thành công', 'success'); navigate('/products'); } catch (err) { showToast(err?.response?.data?.detail || 'Đăng nhập thất bại', 'error'); } finally { setLoading(false); } }; return <AuthShell title="Đăng nhập" subtitle="Truy cập vào hệ thống đặt món" form={form} setForm={setForm} submit={submit} loading={loading} mode="login" footer={<InlineLink to="/register" label="Chưa có tài khoản? Đăng ký" />} />; }
function RegisterPage({ showToast }) { const navigate = useNavigate(); const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' }); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setLoading(true); try { await api.post('/auth/register', form); showToast('Đăng ký thành công. Hãy đăng nhập.', 'success'); navigate('/login'); } catch (err) { showToast(err?.response?.data?.detail || 'Đăng ký thất bại', 'error'); } finally { setLoading(false); } }; return <AuthShell title="Đăng ký" subtitle="Tạo tài khoản mới" form={form} setForm={setForm} submit={submit} loading={loading} mode="register" footer={<InlineLink to="/login" label="Đã có tài khoản? Đăng nhập" />} />; }
function AuthShell({ title, subtitle, form, setForm, submit, loading, mode, footer }) { return <div className="mx-auto max-w-2xl animate-fadeUp"><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft sm:p-8"><div className="mb-6"><h2 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-2 text-slate-600">{subtitle}</p></div><form onSubmit={submit} className="grid gap-4">{mode === 'register' && <Input label="Họ tên" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Nguyễn Văn A" />}{mode === 'login' ? <Input label="Email" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="you@example.com" /> : <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" />}<Input label="Mật khẩu" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />{mode === 'register' && <Input label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0912345678" />}<button disabled={loading} className="mt-2 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Đang xử lý...' : title}</button></form><div className="mt-5 text-sm text-slate-600">{footer}</div></div></div>; }
function Input({ label, value, onChange, type = 'text', placeholder }) { return <label className="grid gap-2"><span className="text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label>; }
function InlineLink({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="font-medium text-brand-700 transition hover:text-brand-800 hover:underline">{label}</button>; }

function ProductsPage() { const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { api.get('/products').then(({ data }) => setProducts(Array.isArray(data) && data.length ? data : fallbackProducts)).catch(() => setProducts(fallbackProducts)).finally(() => setLoading(false)); }, []); return <div className="animate-fadeUp"><SectionHeader title="Sản phẩm" subtitle="Danh sách món ăn hiển thị từ API, fallback bằng dữ liệu mẫu nếu backend chưa sẵn sàng." />{loading ? <CardGridSkeleton /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}</div>; }
function ProductCard({ product }) { const navigate = useNavigate(); return <button onClick={() => navigate(`/products/${product.id}`)} className="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white text-left shadow-soft transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,.10)]"><div className="relative h-48 overflow-hidden bg-stone-100"><img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700">{product.category}</div></div><div className="p-5"><h3 className="text-lg font-semibold text-slate-900">{product.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p><div className="mt-4 flex items-center justify-between"><div className="text-lg font-semibold text-brand-700">{currency.format(product.price)}</div><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">Xem chi tiết</span></div></div></button>; }

function ProductDetailPage({ showToast, addNotification }) { const { id } = useParams(); const navigate = useNavigate(); const [product, setProduct] = useState(null); const [loading, setLoading] = useState(true); const [quantity, setQuantity] = useState(1); useEffect(() => { setLoading(true); api.get(`/products/${id}`).then(({ data }) => setProduct(data || fallbackProducts.find((item) => String(item.id) === String(id)) || fallbackProducts[0])).catch(() => setProduct(fallbackProducts.find((item) => String(item.id) === String(id)) || fallbackProducts[0])).finally(() => setLoading(false)); }, [id]); const orderNow = async () => { try { const payload = { user_id: Number(localStorage.getItem('current_user_id') || 1), order_items: [{ product_id: Number(product?.id || id), quantity }] }; await api.post('/orders', payload); addNotification((prev) => [{ id: Date.now(), content: `Đã tạo đơn cho ${product?.name || 'sản phẩm'}`, created_at: new Date().toISOString(), status: 'unread' }, ...prev].slice(0, 8)); showToast('Đặt hàng thành công', 'success'); navigate('/orders'); } catch (err) { showToast(err?.response?.data?.detail || 'Không thể đặt hàng', 'error'); } }; if (loading) return <DetailSkeleton />; if (!product) return <EmptyState title="Không tìm thấy sản phẩm" description="Sản phẩm này không còn tồn tại hoặc dữ liệu chưa tải được." />; const imageSrc = product.image_url || product.image || fallbackProducts[0].image_url; return <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-fadeUp"><div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-soft"><img src={imageSrc} alt={product.name} className="h-[420px] w-full object-cover" /></div><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft"><div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{product.category}</div><h2 className="mt-4 text-3xl font-semibold tracking-tight">{product.name}</h2><div className="mt-3 text-2xl font-semibold text-brand-700">{currency.format(product.price)}</div><p className="mt-4 leading-7 text-slate-600">{product.description}</p><div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-2"><span className="text-sm font-medium text-slate-700">Số lượng</span><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-brand-400 focus:bg-white" /></label><button onClick={orderNow} className="rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">Đặt món</button></div></div></div>; }

function OrdersPage({ auth, showToast }) { const navigate = useNavigate(); const [orders, setOrders] = useState([]); useEffect(() => { if (!auth.token) { showToast('Bạn cần đăng nhập để xem đơn hàng', 'error'); navigate('/login'); return; } api.get('/orders').then(({ data }) => setOrders(Array.isArray(data) ? data : [])).catch(() => setOrders([])); }, [auth.token, navigate, showToast]); return <div className="animate-fadeUp"><SectionHeader title="Đơn hàng" subtitle="Danh sách các đơn đã đặt từ microservice backend." />{orders.length ? <div className="grid gap-4">{orders.map((order) => <OrderCard key={order.id} order={order} />)}</div> : <EmptyState title="Chưa có đơn hàng nào" description="Khi tạo order, danh sách sẽ xuất hiện ở đây." />}</div>; }
function OrderCard({ order }) { return <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-lg font-semibold">Đơn #{order.id}</div><div className="text-sm text-slate-500">{order.status}</div></div><div className="text-lg font-semibold text-brand-700">{currency.format(order.total_amount || 0)}</div></div><div className="mt-4 space-y-3">{order.order_items?.map((item, idx) => <div key={idx} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm"><span>Product #{item.product_id} × {item.quantity}</span><span className="font-medium">{currency.format(item.price || 0)}</span></div>)}</div></div>; }

function AdminLayout({ auth, showToast }) { const navigate = useNavigate(); const location = useLocation(); const [users, setUsers] = useState([]); const [products, setProducts] = useState([]); const [orders, setOrders] = useState([]); const [notifications, setNotifications] = useState([]); const [loading, setLoading] = useState(true); const [productForm, setProductForm] = useState({ name: '', price: '', category: '', description: '', image_url: '' }); useEffect(() => { const load = async () => { setLoading(true); try { const [usersRes, productsRes, ordersRes, notificationsRes] = await Promise.allSettled([api.get('/users'), api.get('/products'), api.get('/orders'), api.get('/notifications')]); if (usersRes.status === 'fulfilled') setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []); if (productsRes.status === 'fulfilled') setProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : fallbackProducts); if (ordersRes.status === 'fulfilled') setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []); if (notificationsRes.status === 'fulfilled') setNotifications(Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : []); } catch { showToast('Không tải được dữ liệu admin', 'error'); } finally { setLoading(false); } }; load(); }, [showToast]); const createProduct = async (e) => { e.preventDefault(); try { const payload = { ...productForm, price: Number(productForm.price) }; await api.post('/products', payload); showToast('Tạo sản phẩm thành công', 'success'); setProductForm({ name: '', price: '', category: '', description: '', image_url: '' }); const { data } = await api.get('/products'); setProducts(Array.isArray(data) ? data : []); } catch (err) { showToast(err?.response?.data?.detail || 'Tạo sản phẩm thất bại', 'error'); } }; const sidebarItems = [{ key: 'dashboard', label: 'Dashboard' }, { key: 'users', label: 'Users' }, { key: 'products', label: 'Products' }, { key: 'orders', label: 'Orders' }, { key: 'notifications', label: 'Notifications' }]; const activeTab = location.hash.replace('#', '') || 'dashboard'; return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><aside className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-soft lg:sticky lg:top-24 lg:h-fit"><div className="mb-4 rounded-[1.5rem] bg-brand-50 p-4"><div className="text-sm font-semibold text-brand-800">Admin Panel</div><div className="mt-1 text-sm text-slate-600">Xin chào, {auth.user?.full_name || 'Admin'}</div></div><div className="space-y-2">{sidebarItems.map((item) => <button key={item.key} onClick={() => navigate(`/admin#${item.key}`)} className={clsx('flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition', activeTab === item.key ? 'bg-brand-100 text-brand-800' : 'bg-stone-50 text-slate-700 hover:bg-stone-100')}>{item.label}<ChevronRight size={16} /></button>)}</div></aside><section className="space-y-6"><SectionHeader title="Admin Dashboard" subtitle="Quản trị users, products, orders và notifications trong một giao diện gọn gàng." />{loading ? <CardGridSkeleton /> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Users" value={users.length} icon={User} /><MetricCard label="Products" value={products.length} icon={Store} /><MetricCard label="Orders" value={orders.length} icon={ShoppingBag} /><MetricCard label="Notifications" value={notifications.length} icon={Bell} /></div><div className="grid gap-6 xl:grid-cols-[1fr_380px]"><div className="space-y-6"><Panel title="Quản lý users" subtitle="Danh sách tài khoản đang có trong hệ thống"><div className="overflow-hidden rounded-2xl border border-stone-200"><table className="w-full text-sm"><thead className="bg-stone-50 text-left text-slate-600"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Active</th></tr></thead><tbody>{users.length ? users.map((user) => <tr key={user.id} className="border-t border-stone-200"><td className="px-4 py-3">#{user.id}</td><td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3"><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{user.role}</span></td><td className="px-4 py-3">{user.is_active ? 'Yes' : 'No'}</td></tr>) : <tr><td className="px-4 py-6 text-center text-slate-500" colSpan="5">Chưa có dữ liệu users.</td></tr>}</tbody></table></div></Panel><Panel title="Quản lý products" subtitle="Tạo mới sản phẩm trực tiếp từ admin panel"><form onSubmit={createProduct} className="grid gap-4 sm:grid-cols-2"><Field label="Tên sản phẩm" value={productForm.name} onChange={(v) => setProductForm((p) => ({ ...p, name: v }))} /><Field label="Giá" type="number" value={productForm.price} onChange={(v) => setProductForm((p) => ({ ...p, price: v }))} /><Field label="Danh mục" value={productForm.category} onChange={(v) => setProductForm((p) => ({ ...p, category: v }))} /><Field label="Ảnh URL" value={productForm.image_url} onChange={(v) => setProductForm((p) => ({ ...p, image_url: v }))} /><div className="sm:col-span-2"><label className="grid gap-2"><span className="text-sm font-medium text-slate-700">Mô tả</span><textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} rows="4" className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label></div><div className="sm:col-span-2 flex justify-end"><button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700"><PlusCircle size={16} /> Tạo sản phẩm</button></div></form></Panel></div><div className="space-y-6"><Panel title="Tổng quan service" subtitle="Trạng thái nhanh cho báo cáo/demo"><div className="space-y-3 text-sm text-slate-600"><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>API Gateway</span><span className="font-semibold text-emerald-600">Running</span></div><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>Auth Service</span><span className="font-semibold text-emerald-600">Running</span></div><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>RabbitMQ</span><span className="font-semibold text-emerald-600">Running</span></div></div></Panel><Panel title="Orders gần đây" subtitle="Theo dõi đơn hàng mới tạo"><div className="space-y-3">{orders.length ? orders.slice(0, 5).map((order) => <div key={order.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm"><div className="flex items-center justify-between"><div className="font-semibold text-slate-900">Order #{order.id}</div><div className="text-brand-700">{currency.format(order.total_amount || 0)}</div></div><div className="mt-1 text-slate-500">{order.status}</div></div>) : <EmptyState title="Chưa có order" description="Order mới sẽ hiển thị ở đây." />}</div></Panel><Panel title="Notifications" subtitle="Sự kiện gần nhất từ hệ thống"><div className="space-y-2">{notifications.length ? notifications.slice(0, 5).map((item) => <NotificationItem key={item.id} item={{ ...item, read: false }} />) : <EmptyState title="Chưa có notification" description="Các thông báo mới sẽ xuất hiện ở đây." />}</div></Panel></div></div></>}</section></div>; }

function Panel({ title, subtitle, children }) { return <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="mb-4"><div className="text-lg font-semibold text-slate-900">{title}</div><div className="mt-1 text-sm text-slate-500">{subtitle}</div></div>{children}</div>; }
function MetricCard({ label, value, icon: Icon }) { return <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Icon size={20} /></div></div></div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="grid gap-2"><span className="text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} type={type} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label>; }
function SectionHeader({ title, subtitle }) { return <div className="mb-6"><h2 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-2 max-w-3xl text-slate-600">{subtitle}</p></div>; }
function EmptyState({ title, description }) { return <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center shadow-soft"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Package size={20} /></div><div className="text-lg font-semibold text-slate-900">{title}</div><div className="mt-2 text-sm leading-6 text-slate-500">{description}</div></div>; }
function NotificationItem({ item }) { return <div className={clsx('rounded-2xl border p-3 transition', item.read ? 'border-stone-200 bg-white' : 'border-brand-200 bg-brand-50/70')}><div className="text-sm font-medium text-slate-800">{item.content || item.message || 'Notification'}</div><div className="mt-1 text-xs text-slate-500">{new Date(item.created_at || item.createdAt || Date.now()).toLocaleString()}</div></div>; }
function ToastStack({ toast }) { if (!toast) return null; const styles = { success: 'bg-emerald-600', error: 'bg-red-500', info: 'bg-slate-900' }; return <div className="fixed bottom-5 right-5 z-[80] animate-fadeUp"><div className={clsx('rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]', styles[toast.type] || styles.info)}>{toast.message}</div></div>; }
function PrimaryButton({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-700">{label}</button>; }
function SecondaryButton({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">{label}</button>; }
function Footer() { return <footer className="border-t border-stone-200 bg-white/80"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2 font-medium text-slate-700"><Sparkles size={16} className="text-brand-600" /> FoodFlow demo</div><div>React + Tailwind • Gateway • Microservice ordering experience</div></div></footer>; }
function CardGridSkeleton() { return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[360px] animate-pulse rounded-[1.75rem] bg-white shadow-soft" />)}</div>; }
function DetailSkeleton() { return <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"><div className="h-[420px] animate-pulse rounded-[2rem] bg-white shadow-soft" /><div className="h-[420px] animate-pulse rounded-[2rem] bg-white shadow-soft" /></div>; }

export default App;
