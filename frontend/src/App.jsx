import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight, Heart, Home, LayoutDashboard, LogIn, LogOut, Menu, Package, PlusCircle, ShoppingBag, Sparkles, Store, Trash2, User, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';
import api from './api';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const emptyImage = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#f8fafc"/><rect x="120" y="90" width="360" height="220" rx="28" fill="#fff7ed" stroke="#fed7aa"/><circle cx="300" cy="180" r="56" fill="#fdba74"/><path d="M300 136c24 0 44 20 44 44s-20 44-44 44-44-20-44-44 20-44 44-44z" fill="#fff" opacity=".7"/></svg>`);
const fallbackProducts = [];

function App() {
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [cart, setCart] = useState([]);
  const [authState, setAuthState] = useState({ token: localStorage.getItem('access_token'), user: null, loading: true });

  const showToast = (message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 3000);
  };

  const refreshMe = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return setAuthState({ token: null, user: null, loading: false });
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
      if (!authState.token) return setNotifications([]);
      try {
        const { data } = await api.get('/notifications');
        setNotifications(Array.isArray(data) ? data.map((x) => ({ ...x, read: x.status === 'read' })) : []);
      } catch { setNotifications([]); }
    };
    loadNotifications();
  }, [authState.token]);

  const auth = useMemo(() => ({
    ...authState,
    login: async (token) => {
      localStorage.setItem('access_token', token);
      setAuthState((prev) => ({ ...prev, token, loading: false }));
      try { const { data } = await api.get('/auth/me'); setAuthState((prev) => ({ ...prev, token, user: data, loading: false })); }
      catch { setAuthState((prev) => ({ ...prev, token, user: null, loading: false })); }
    },
    logout: () => { localStorage.removeItem('access_token'); setAuthState({ token: null, user: null, loading: false }); setCart([]); },
  }), [authState]);

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const found = prev.find((x) => x.product.id === product.id);
      if (found) return prev.map((x) => x.product.id === product.id ? { ...x, quantity: x.quantity + quantity } : x);
      return [...prev, { product, quantity }];
    });
    showToast('Đã thêm vào giỏ hàng', 'success');
  };
  const updateQty = (productId, quantity) => setCart((prev) => prev.map((x) => x.product.id === productId ? { ...x, quantity: Math.max(1, quantity) } : x));
  const removeItem = (productId) => setCart((prev) => prev.filter((x) => x.product.id !== productId));

  return <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f5_0%,#fffdfb_38%,#fffefe_100%)] text-slate-800"><div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_60%)]" /><Header auth={auth} notifications={notifications} setNotifications={setNotifications} showToast={showToast} cartCount={cart.reduce((s, x) => s + x.quantity, 0)} /><main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8"><Routes><Route path="/" element={<HomePage auth={auth} />} /><Route path="/login" element={<LoginPage auth={auth} showToast={showToast} />} /><Route path="/register" element={<RegisterPage showToast={showToast} />} /><Route path="/products" element={<ProductsPage />} /><Route path="/products/:id" element={<ProductDetailPage addToCart={addToCart} showToast={showToast} />} /><Route path="/cart" element={<CartPage auth={auth} cart={cart} updateQty={updateQty} removeItem={removeItem} showToast={showToast} />} /><Route path="/orders" element={<OrdersPage auth={auth} showToast={showToast} />} /><Route path="/admin/*" element={<AdminGuard auth={auth}><AdminLayout auth={auth} showToast={showToast} /></AdminGuard>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main><Footer /><ToastStack toast={toast} /></div>;
}

function AdminGuard({ auth, children }) { const isAdmin = (auth.user?.role || '').toLowerCase() === 'admin'; if (!auth.token) return <Navigate to="/login" replace />; if (!isAdmin) return <Navigate to="/" replace />; return children; }

function Header({ auth, notifications, setNotifications, showToast, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const bellRef = useRef(null);
  const cartRef = useRef(null);
  const isAdmin = (auth.user?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    const onClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (cartRef.current && !cartRef.current.contains(e.target)) setCartOpen(false);
    };
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
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-[0_12px_30px_rgba(249,115,22,0.22)]">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">FoodFlow</div>
            <div className="text-xs text-slate-500">Microservice demo</div>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavButton key={item.to} {...item} active={location.pathname === item.to} />
          ))}
          {isAdmin && <NavButton to="/admin" label="Admin" icon={LayoutDashboard} active={location.pathname.startsWith('/admin')} />}
        </nav>

        <div className="flex items-center gap-2">
          <div ref={cartRef} className="relative">
            <button onClick={() => setCartOpen((v) => !v)} className="relative rounded-2xl border border-stone-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute right-2 top-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{cartCount}</span>}
            </button>
            {cartOpen && <CartDropdown cartRef={cartRef} auth={auth} cartCount={cartCount} setCartOpen={setCartOpen} showToast={showToast} navigate={navigate} />}
          </div>

          <div ref={bellRef} className="relative">
            <button onClick={() => setBellOpen((v) => !v)} className="relative rounded-2xl border border-stone-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
              <Bell size={18} />
              {notifications.some((n) => !n.read) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-500" />}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] animate-fadeUp">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-900">Thông báo</div>
                    <div className="text-xs text-slate-500">Cập nhật đơn hàng, sự kiện hệ thống</div>
                  </div>
                  <button onClick={() => setNotifications([])} className="text-xs font-medium text-brand-700 transition hover:text-brand-800">Xóa hết</button>
                </div>
                <div className="max-h-80 overflow-auto p-3">
                  {notifications.length === 0 ? (
                    <EmptyState title="Chưa có thông báo" description="Các sự kiện mới sẽ xuất hiện tại đây." />
                  ) : (
                    <div className="space-y-2">{notifications.map((item) => <NotificationItem key={item.id} item={item} />)}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {auth.token ? (
            <button onClick={() => { auth.logout(); showToast('Đã đăng xuất', 'info'); navigate('/login'); }} className="hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft sm:flex">
              <LogOut size={16} /> Đăng xuất
            </button>
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
            {!auth.token && (
              <>
                <MobileNav to="/login" label="Đăng nhập" icon={LogIn} onClick={() => setMenuOpen(false)} />
                <MobileNav to="/register" label="Đăng ký" icon={UserPlus} onClick={() => setMenuOpen(false)} />
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavButton({ to, label, icon: Icon, active = false }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className={clsx('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition', active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900')}><Icon size={16} /> {label}</button>; }
function MobileNav({ to, label, icon: Icon, onClick }) { const navigate = useNavigate(); return <button onClick={() => { onClick?.(); navigate(to); }} className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-white"><Icon size={16} /> {label}</button>; }
function TopAction({ to, label, icon: Icon, secondary = false }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className={clsx('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5', secondary ? 'border border-stone-200 bg-white text-slate-700 hover:shadow-soft' : 'bg-brand-600 text-white hover:bg-brand-700')}><Icon size={16} /> {label}</button>; }

function HomePage({ auth }) { const featuredProducts = [ { id: 1, name: 'Cơm gà sốt tiêu', price: 49000, description: 'Cơm nóng, gà mềm, sốt tiêu nhẹ dễ ăn.', category: 'Best seller', image_url: emptyImage }, { id: 2, name: 'Bún bò cay nhẹ', price: 56000, description: 'Bún bò đậm vị, cay rất nhẹ, hợp bữa trưa.', category: 'Popular', image_url: emptyImage }, { id: 3, name: 'Salad cá hồi', price: 72000, description: 'Salad tươi, cá hồi áp chảo, vị nhẹ nhàng.', category: 'Healthy', image_url: emptyImage }, ]; return <div className="grid gap-8 animate-fadeUp"><section className="overflow-hidden rounded-[2.25rem] border border-stone-200 bg-white shadow-soft"><div className="grid gap-8 p-7 lg:grid-cols-[1.12fr_0.88fr] lg:p-10"><div><div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-medium text-brand-800"><Sparkles size={16} /> Đặt món ngon mỗi ngày</div><h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Đồ ăn ngon, giao diện đẹp, đặt hàng nhanh và nhận thông báo tức thì.</h1><p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">FoodFlow là trang đặt đồ ăn demo với trải nghiệm mượt, tone đỏ cam nhẹ, bố cục rõ ràng và chỉn chu.</p><div className="mt-7 flex flex-wrap gap-3"><PrimaryButton to="/products" label="Xem món nổi bật" /><SecondaryButton to={auth.token ? '/cart' : '/login'} label={auth.token ? 'Đến giỏ hàng' : 'Đăng nhập ngay'} /></div></div><div className="grid gap-4"><HeroCard title="Cam kết của chúng tôi" items={['Món ăn trình bày rõ ràng', 'Giá hiển thị minh bạch', 'Đặt hàng nhanh, thông báo rõ']} /><HeroCard title="Điểm nổi bật" items={['Giao diện tối giản', 'Animation nhẹ', 'Phù hợp demo']} /></div></div></section><section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft"><div className="mb-4"><div className="text-sm font-semibold text-brand-700">Món nổi bật hôm nay</div><p className="mt-1 text-sm text-slate-500">Ảnh placeholder sẽ thay bằng ảnh từ database khi có dữ liệu.</p></div><div className="grid gap-4">{featuredProducts.map((product) => <button key={product.id} onClick={() => {}} className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white"><img src={product.image_url} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{product.name}</div><div className="mt-1 line-clamp-1 text-sm text-slate-500">{product.description}</div></div><div className="text-sm font-semibold text-brand-700">{currency.format(product.price)}</div></button>)}</div></div><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft"><div className="mb-4"><div className="text-sm font-semibold text-brand-700">Quy trình đặt món</div><p className="mt-1 text-sm text-slate-500">Chọn nhiều sản phẩm rồi checkout một lần</p></div><div className="grid gap-4 md:grid-cols-3"><ProcessStep number="01" title="Chọn món" desc="Xem danh sách sản phẩm và thêm vào giỏ." /><ProcessStep number="02" title="Giỏ hàng" desc="Gom nhiều sản phẩm trong một đơn." /><ProcessStep number="03" title="Thanh toán" desc="Gửi nhiều order_items cùng lúc." /></div></div></section></div>; }
function HeroCard({ title, items }) { return <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><div className="text-lg font-semibold text-slate-900">{title}</div><div className="text-sm text-slate-500">Tối ưu cho trải nghiệm người dùng</div></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Heart size={18} /></div></div><div className="space-y-3">{items.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700"><span className="h-2 w-2 rounded-full bg-brand-500" /> {item}</div>)}</div></div>; }
function ProcessStep({ number, title, desc }) { return <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5"><div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{number}</div><div className="mt-4 text-lg font-semibold text-slate-900">{title}</div><div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div></div>; }
function PrimaryButton({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-700">{label}</button>; }
function SecondaryButton({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">{label}</button>; }

function LoginPage({ auth, showToast }) { const navigate = useNavigate(); const [form, setForm] = useState({ username: '', password: '' }); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setLoading(true); try { const body = new URLSearchParams({ username: form.username, password: form.password }); const { data } = await api.post('/auth/login', body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); await auth.login(data.access_token); showToast('Đăng nhập thành công', 'success'); navigate('/products'); } catch (err) { showToast(err?.response?.data?.detail || 'Đăng nhập thất bại', 'error'); } finally { setLoading(false); } }; return <AuthShell title="Đăng nhập" form={form} setForm={setForm} submit={submit} loading={loading} mode="login" footer={<InlineLink to="/register" label="Chưa có tài khoản? Đăng ký" />} />; }
function RegisterPage({ showToast }) { const navigate = useNavigate(); const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' }); const [loading, setLoading] = useState(false); const submit = async (e) => { e.preventDefault(); setLoading(true); try { await api.post('/auth/register', form); showToast('Đăng ký thành công. Hãy đăng nhập.', 'success'); navigate('/login'); } catch (err) { showToast(err?.response?.data?.detail || 'Đăng ký thất bại', 'error'); } finally { setLoading(false); } }; return <AuthShell title="Đăng ký" form={form} setForm={setForm} submit={submit} loading={loading} mode="register" footer={<InlineLink to="/login" label="Đã có tài khoản? Đăng nhập" />} />; }
function AuthShell({ title, form, setForm, submit, loading, mode, footer }) { return <div className="mx-auto max-w-2xl animate-fadeUp"><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft sm:p-8"><div className="mb-6"><h2 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-2 text-slate-600">{mode === 'login' ? 'Truy cập vào hệ thống đặt món' : 'Tạo tài khoản mới'}</p></div><form onSubmit={submit} className="grid gap-4">{mode === 'register' && <Input label="Họ tên" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Nguyễn Văn A" />}{mode === 'login' ? <Input label="Email" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="you@example.com" /> : <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" />}<Input label="Mật khẩu" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />{mode === 'register' && <Input label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0912345678" />}<button disabled={loading} className="mt-2 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Đang xử lý...' : title}</button></form><div className="mt-5 text-sm text-slate-600">{footer}</div></div></div>; }
function Input({ label, value, onChange, type = 'text', placeholder }) { return <label className="grid gap-2"><span className="text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label>; }
function InlineLink({ to, label }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)} className="font-medium text-brand-700 transition hover:text-brand-800 hover:underline">{label}</button>; }

function ProductsPage() {
  const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/products').then(({ data }) => setProducts(Array.isArray(data) ? data : [])).catch(() => setProducts([])).finally(() => setLoading(false)); }, []);
  return <div className="animate-fadeUp"><SectionHeader title="Sản phẩm" subtitle="Ảnh chỉ hiển thị từ database backend (field `image_url`)." />{loading ? <CardGridSkeleton /> : products.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <EmptyState title="Chưa có sản phẩm" description="Tạo sản phẩm trong admin panel hoặc seed DB để hiển thị tại đây." />}</div>;
}
function ProductCard({ product }) { const navigate = useNavigate(); const imageSrc = product.image_url || emptyImage; return <button onClick={() => navigate(`/products/${product.id}`)} className="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white text-left shadow-soft transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,.10)]"><div className="relative h-48 overflow-hidden bg-stone-100"><img src={imageSrc} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700">{product.category}</div></div><div className="p-5"><h3 className="text-lg font-semibold text-slate-900">{product.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p><div className="mt-4 flex items-center justify-between"><div className="text-lg font-semibold text-brand-700">{currency.format(product.price)}</div><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">Xem chi tiết</span></div></div></button>; }

async function loadProductMap(orderItems) {
  const entries = await Promise.all((orderItems || []).map(async (item) => {
    try {
      const { data } = await api.get(`/products/${item.product_id}`);
      return [item.product_id, data];
    } catch {
      return [item.product_id, null];
    }
  }));
  return Object.fromEntries(entries);
}

function ProductDetailPage({ addToCart, showToast }) { const { id } = useParams(); const [product, setProduct] = useState(null); const [loading, setLoading] = useState(true); const [quantity, setQuantity] = useState(1); const navigate = useNavigate(); useEffect(() => { setLoading(true); api.get(`/products/${id}`).then(({ data }) => setProduct(data)).catch(() => setProduct(null)).finally(() => setLoading(false)); }, [id]); if (loading) return <DetailSkeleton />; if (!product) return <EmptyState title="Không tìm thấy sản phẩm" description="Sản phẩm chưa tồn tại hoặc backend chưa trả dữ liệu." />; const imageSrc = product.image_url || emptyImage; return <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-fadeUp"><div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-soft"><img src={imageSrc} alt={product.name} className="h-[420px] w-full object-cover" /></div><div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-soft"><div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{product.category}</div><h2 className="mt-4 text-3xl font-semibold tracking-tight">{product.name}</h2><div className="mt-3 text-2xl font-semibold text-brand-700">{currency.format(product.price)}</div><p className="mt-4 leading-7 text-slate-600">{product.description}</p><div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-2"><span className="text-sm font-medium text-slate-700">Số lượng</span><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-brand-400 focus:bg-white" /></label><button onClick={() => { addToCart(product, quantity); showToast('Đã thêm sản phẩm vào giỏ', 'success'); navigate('/cart'); }} className="rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">Thêm vào giỏ</button></div></div></div>; }

function CartDropdown({ cartRef, auth, cartCount, setCartOpen, showToast, navigate }) {
  return (
    <div className="absolute right-0 mt-3 w-[380px] overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] animate-fadeUp">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div>
          <div className="font-semibold text-slate-900">Giỏ hàng</div>
          <div className="text-xs text-slate-500">{cartCount} sản phẩm đang chờ thanh toán</div>
        </div>
        <button onClick={() => { setCartOpen(false); navigate('/cart'); }} className="text-xs font-medium text-brand-700 transition hover:text-brand-800">Mở trang giỏ</button>
      </div>
      <div className="p-4">
        <EmptyState title="Giỏ hàng đang trống" description="Thêm món từ trang chi tiết để xem danh sách tại đây." />
      </div>
      <div className="border-t border-stone-100 px-4 py-3">
        <button onClick={() => { setCartOpen(false); navigate('/cart'); }} className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">Đi tới giỏ hàng</button>
      </div>
    </div>
  );
}

function CartPage({ auth, cart, updateQty, removeItem, showToast }) {
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const checkout = async () => {
    if (!auth.token) return showToast('Bạn cần đăng nhập để đặt hàng', 'error');
    if (!cart.length) return showToast('Giỏ hàng đang trống', 'error');
    try {
      await api.post('/orders', { user_id: auth.user?.id || Number(localStorage.getItem('current_user_id') || 1), order_items: cart.map((x) => ({ product_id: x.product.id, quantity: x.quantity })) });
      showToast('Đặt hàng thành công', 'success');
      navigate('/orders');
      window.location.reload();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Không thể tạo đơn', 'error');
    }
  };
  return <div className="animate-fadeUp"><SectionHeader title="Giỏ hàng" subtitle="Một đơn có thể chứa nhiều sản phẩm khác nhau." />{cart.length ? <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="space-y-4">{cart.map((item) => <div key={item.product.id} className="rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-soft"><div className="flex gap-4"><img src={item.product.image_url || emptyImage} alt={item.product.name} className="h-20 w-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="text-lg font-semibold text-slate-900">{item.product.name}</div><div className="mt-1 text-sm text-slate-500">{currency.format(item.product.price)}</div><div className="mt-3 flex items-center gap-3"><input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.product.id, Number(e.target.value))} className="w-24 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" /><button onClick={() => removeItem(item.product.id)} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-slate-600 hover:bg-stone-50"><Trash2 size={16} /> Xóa</button></div></div></div></div>)}</div><div className="h-fit rounded-[2rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="text-lg font-semibold text-slate-900">Tổng kết</div><div className="mt-4 space-y-2 text-sm text-slate-600">{cart.map((i) => <div key={i.product.id} className="flex justify-between"><span>{i.product.name} × {i.quantity}</span><span>{currency.format(Number(i.product.price) * i.quantity)}</span></div>)}</div><div className="my-4 border-t border-stone-200 pt-4 flex justify-between text-base font-semibold"><span>Tổng tiền</span><span className="text-brand-700">{currency.format(total)}</span></div><button onClick={checkout} className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Đặt hàng</button></div></div> : <EmptyState title="Giỏ hàng trống" description="Hãy thêm một hoặc nhiều sản phẩm để checkout." />}</div>;
}

function OrdersPage({ auth, showToast }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!auth.token) {
      showToast('Bạn cần đăng nhập để xem đơn hàng', 'error');
      navigate('/login');
      return;
    }
    api.get('/orders').then(({ data }) => setOrders(Array.isArray(data) ? data : [])).catch(() => setOrders([]));
  }, [auth.token, navigate, showToast]);

  return (
    <div className="animate-fadeUp">
      <SectionHeader title="Đơn hàng" subtitle="Bấm vào từng đơn để xem chi tiết dạng sheet." />
      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <button key={order.id} onClick={() => setSelectedOrder(order)} className="rounded-[1.75rem] border border-stone-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Đơn #{order.id}</div>
                  <div className="text-sm text-slate-500">{order.status}</div>
                </div>
                <div className="text-lg font-semibold text-brand-700">{currency.format(order.total_amount || 0)}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-stone-100 px-3 py-1">{order.order_items?.length || 0} sản phẩm</span>
                <span className="rounded-full bg-stone-100 px-3 py-1">Bấm để xem chi tiết</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có đơn hàng nào" description="Khi tạo order, danh sách sẽ xuất hiện ở đây." />
      )}
      {selectedOrder && <OrderSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

function OrderCard({ order }) { return <div />; }

function OrderSheet({ order, onClose }) {
  const [productMap, setProductMap] = useState({});
  const items = Array.isArray(order.order_items) ? order.order_items : [];

  useEffect(() => {
    let mounted = true;
    loadProductMap(items).then((map) => { if (mounted) setProductMap(map); });
    return () => { mounted = false; };
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 w-full max-w-[520px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] animate-fadeUp">
        <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Chi tiết đơn hàng</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">Đơn #{order.id}</div>
            <div className="mt-1 text-sm text-slate-500">{order.status}</div>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-stone-200 p-2 text-slate-600 hover:bg-stone-50"><X size={18} /></button>
        </div>
        <div className="h-[calc(100vh-160px)] overflow-auto px-5 py-4">
          <div className="space-y-3">
            {items.map((item) => {
              const product = productMap[item.product_id];
              const name = product?.name || `Sản phẩm #${item.product_id}`;
              const imageSrc = product?.image_url || emptyImage;
              return (
                <div key={`${item.product_id}-${item.quantity}`} className="flex items-center gap-4 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-3">
                  <img src={imageSrc} alt={name} className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{name}</div>
                    <div className="text-xs text-slate-500">Đơn giá: {currency.format(item.price || 0)}</div>
                  </div>
                  <div className="text-right text-sm text-slate-700">
                    <div>x{item.quantity}</div>
                    <div className="font-semibold text-brand-700">{currency.format((Number(item.price) || 0) * (item.quantity || 0))}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600"><span>Tổng tiền</span><span className="font-semibold text-slate-900">{currency.format(order.total_amount || 0)}</span></div>
            <div className="mt-2 text-2xl font-semibold text-brand-700">{currency.format(order.total_amount || 0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLayout({ auth, showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productForm, setProductForm] = useState({ name: '', price: '', category: '', description: '', image_url: '' });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusBusy, setStatusBusy] = useState({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes, ordersRes, notificationsRes] = await Promise.allSettled([api.get('/users'), api.get('/products'), api.get('/orders/admin'), api.get('/notifications')]);
      if (usersRes.status === 'fulfilled') setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []);
      if (productsRes.status === 'fulfilled') setProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : []);
      if (ordersRes.status === 'fulfilled') setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      if (notificationsRes.status === 'fulfilled') setNotifications(Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : []);
    } catch { showToast('Không tải được dữ liệu admin', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [showToast]);
  useEffect(() => { const key = location.hash.replace('#', '') || 'dashboard'; setActiveTab(key); }, [location.hash]);

  const createProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', { ...productForm, price: Number(productForm.price) });
      showToast('Tạo sản phẩm thành công', 'success');
      setProductModalOpen(false);
      setProductForm({ name: '', price: '', category: '', description: '', image_url: '' });
      loadAll();
    } catch (err) { showToast(err?.response?.data?.detail || 'Tạo sản phẩm thất bại', 'error'); }
  };

  const updateOrderStatus = async (orderId, status) => {
    setStatusBusy((p) => ({ ...p, [orderId]: true }));
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      showToast(`Đã cập nhật order #${orderId} -> ${status}`, 'success');
      loadAll();
      if (selectedOrder?.id === orderId) setSelectedOrder((prev) => ({ ...prev, status }));
    } catch (err) { showToast(err?.response?.data?.detail || 'Cập nhật status thất bại', 'error'); }
    finally { setStatusBusy((p) => ({ ...p, [orderId]: false })); }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'users', label: 'Users' },
    { key: 'products', label: 'Products' },
    { key: 'orders', label: 'Orders' },
    { key: 'notifications', label: 'Notifications' },
  ];

  return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><aside className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-soft lg:sticky lg:top-24 lg:h-fit"><div className="mb-4 rounded-[1.5rem] bg-brand-50 p-4"><div className="text-sm font-semibold text-brand-800">Admin Panel</div><div className="mt-1 text-sm text-slate-600">Xin chào, {auth.user?.full_name || 'Admin'}</div></div><div className="space-y-2">{tabs.map((item) => <button key={item.key} onClick={() => navigate(`/admin#${item.key}`)} className={clsx('flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition', activeTab === item.key ? 'bg-brand-100 text-brand-800' : 'bg-stone-50 text-slate-700 hover:bg-stone-100')}>{item.label}<ChevronRight size={16} /></button>)}</div></aside><section className="space-y-6"><SectionHeader title="Admin Dashboard" subtitle="Thống kê nhanh và các bảng quản trị cho users, products, orders." />{loading ? <CardGridSkeleton /> : <>{activeTab === 'dashboard' && <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Users" value={users.length} icon={User} /><MetricCard label="Products" value={products.length} icon={Store} /><MetricCard label="Orders" value={orders.length} icon={ShoppingBag} /><MetricCard label="Notifications" value={notifications.length} icon={Bell} /></div><Panel title="Tổng quan service" subtitle="Trạng thái nhanh cho báo cáo/demo"><div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3"><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>API Gateway</span><span className="font-semibold text-emerald-600">Running</span></div><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>Auth Service</span><span className="font-semibold text-emerald-600">Running</span></div><div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"><span>RabbitMQ</span><span className="font-semibold text-emerald-600">Running</span></div></div></Panel></div>}{activeTab === 'users' && <Panel title="Users" subtitle="Danh sách tất cả người dùng"><div className="overflow-hidden rounded-2xl border border-stone-200"><table className="w-full text-sm"><thead className="bg-stone-50 text-left text-slate-600"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Active</th></tr></thead><tbody>{users.length ? users.map((user) => <tr key={user.id} className="border-t border-stone-200"><td className="px-4 py-3">#{user.id}</td><td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3"><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{user.role}</span></td><td className="px-4 py-3">{user.is_active ? 'Yes' : 'No'}</td></tr>) : <tr><td className="px-4 py-6 text-center text-slate-500" colSpan="5">Chưa có dữ liệu users.</td></tr>}</tbody></table></div></Panel>}{activeTab === 'products' && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setProductModalOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"><PlusCircle size={16} /> Thêm sản phẩm</button></div><Panel title="Products" subtitle="Danh sách sản phẩm dạng sheet, mỗi hàng có avatar, tên, giá"><div className="space-y-3">{products.length ? products.map((product) => <div key={product.id} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-soft"><img src={product.image_url || emptyImage} alt={product.name} className="h-14 w-14 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{product.name}</div><div className="text-sm text-slate-500">{product.category || 'No category'}</div></div><div className="text-sm font-semibold text-brand-700">{currency.format(product.price)}</div></div>) : <EmptyState title="Chưa có sản phẩm" description="Bấm Thêm sản phẩm để tạo mới." />}</div></Panel></div>}{activeTab === 'orders' && <Panel title="Orders" subtitle="Danh sách order, xem chi tiết và cập nhật status bằng tick/x"><div className="space-y-3">{orders.length ? orders.map((order) => { const isFinal = ['completed', 'cancelled'].includes(String(order.status).toLowerCase()); return <button key={order.id} onClick={() => setSelectedOrder(order)} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-soft hover:bg-stone-50"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold text-slate-900">Đơn #{order.id}</div><div className="text-sm text-slate-500">{order.status}</div></div><div className="text-brand-700 font-semibold">{currency.format(order.total_amount || 0)}</div></div>{!isFinal && <div className="mt-3 flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, order.status === 'pending' ? 'delivering' : 'completed'); }} disabled={!!statusBusy[order.id]} className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"><span>✓</span> {order.status === 'pending' ? 'Delivering' : 'Complete'}</button><button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }} disabled={!!statusBusy[order.id]} className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><span>✕</span> Cancel</button></div>}</button>; }) : <EmptyState title="Chưa có order" description="Order mới sẽ hiển thị ở đây." />}</div></Panel>}{activeTab === 'notifications' && <Panel title="Notifications" subtitle="Sự kiện gần nhất từ hệ thống"><div className="space-y-2">{notifications.length ? notifications.slice(0, 10).map((item) => <NotificationItem key={item.id} item={{ ...item, read: false }} />) : <EmptyState title="Chưa có notification" description="Các thông báo mới sẽ xuất hiện ở đây." />}</div></Panel>}</>}
{selectedOrder && <OrderSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
{productModalOpen && <ProductModal form={productForm} setForm={setProductForm} onClose={() => setProductModalOpen(false)} onSubmit={createProduct} />}</section></div>;
}

function Panel({ title, subtitle, children }) { return <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="mb-4"><div className="text-lg font-semibold text-slate-900">{title}</div><div className="mt-1 text-sm text-slate-500">{subtitle}</div></div>{children}</div>; }
function MetricCard({ label, value, icon: Icon }) { return <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Icon size={20} /></div></div></div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="grid gap-2"><span className="text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} type={type} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label>; }
function SectionHeader({ title, subtitle }) { return <div className="mb-6"><h2 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-2 max-w-3xl text-slate-600">{subtitle}</p></div>; }
function EmptyState({ title, description }) { return <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center shadow-soft"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Package size={20} /></div><div className="text-lg font-semibold text-slate-900">{title}</div><div className="mt-2 text-sm leading-6 text-slate-500">{description}</div></div>; }
function NotificationItem({ item }) { return <div className={clsx('rounded-2xl border p-3 transition', item.read ? 'border-stone-200 bg-white' : 'border-brand-200 bg-brand-50/70')}><div className="text-sm font-medium text-slate-800">{item.content || item.message || 'Notification'}</div><div className="mt-1 text-xs text-slate-500">{new Date(item.created_at || item.createdAt || Date.now()).toLocaleString()}</div></div>; }
function ToastStack({ toast }) { if (!toast) return null; const styles = { success: 'bg-emerald-600', error: 'bg-red-500', info: 'bg-slate-900' }; return <div className="fixed bottom-5 right-5 z-[80] animate-fadeUp"><div className={clsx('rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]', styles[toast.type] || styles.info)}>{toast.message}</div></div>; }
function Footer() { return <footer className="border-t border-stone-200 bg-white/80"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2 font-medium text-slate-700"><Sparkles size={16} className="text-brand-600" /> FoodFlow demo</div><div>React + Tailwind • Gateway • Microservice ordering experience</div></div></footer>; }
function CardGridSkeleton() { return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[360px] animate-pulse rounded-[1.75rem] bg-white shadow-soft" />)}</div>; }
function DetailSkeleton() { return <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"><div className="h-[420px] animate-pulse rounded-[2rem] bg-white shadow-soft" /><div className="h-[420px] animate-pulse rounded-[2rem] bg-white shadow-soft" /></div>; }
function ProductModal({ form, setForm, onClose, onSubmit }) { return <div className="fixed inset-0 z-[95] bg-slate-950/40 backdrop-blur-sm"><div className="mx-auto mt-24 w-[min(92vw,720px)] rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Thêm sản phẩm</div><div className="mt-1 text-2xl font-semibold text-slate-900">Tạo mới sản phẩm</div></div><button onClick={onClose} className="rounded-2xl border border-stone-200 p-2 text-slate-600 hover:bg-stone-50"><X size={18} /></button></div><form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Tên sản phẩm" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} /><Field label="Giá" type="number" value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v }))} /><Field label="Danh mục" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} /><Field label="Ảnh URL" value={form.image_url} onChange={(v) => setForm((p) => ({ ...p, image_url: v }))} /><div className="sm:col-span-2"><label className="grid gap-2"><span className="text-sm font-medium text-slate-700">Mô tả</span><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows="4" className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white" /></label></div><div className="sm:col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-2xl border border-stone-200 px-5 py-3 font-semibold text-slate-700 hover:bg-stone-50">Hủy</button><button className="rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Lưu sản phẩm</button></div></form></div></div>; }

export default App;
