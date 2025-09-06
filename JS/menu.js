(() => {
  // ===== Инициализация Telegram WebApp =====
  const tg = window.Telegram.WebApp;
  tg.expand();
  const clientChatId = tg.initDataUnsafe?.user?.id || '';

  // ===== Элементы DOM =====
  const cartBtn = document.getElementById('cartBtn');
  const cartModal = document.getElementById('cartModal');
  const closeCart = document.getElementById('closeCart');
  const cartItemsEl = document.getElementById('cartItems');
  const cartCountEl = document.getElementById('cartCount');
  const cartTotalItemsEl = document.getElementById('cartTotalItems');
  const cartTotalPriceEl = document.getElementById('cartTotalPrice');
  const clearCartBtn = document.getElementById('clearCart');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const orderModal = document.getElementById('orderModal');
  const closeOrder = document.getElementById('closeOrder');
  const orderForm = document.getElementById('orderForm');
  const cancelOrderBtn = document.getElementById('cancelOrderForm');
  const addressBlock = document.getElementById('addressBlock');
  const navButtons = document.querySelectorAll('.nav-btn');
  const notification = document.createElement('div');
  notification.className = 'notification';
  document.body.appendChild(notification);

  // ===== Переменные состояния =====
  let cart = JSON.parse(localStorage.getItem('cart')) || {};
  let currentCategory = 'all';

  // ===== Функции =====
  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function calcTotals() {
    let totalItems = 0, totalPrice = 0;
    Object.values(cart).forEach(it => {
      totalItems += it.qty;
      totalPrice += it.qty * Number(it.price);
    });
    return { totalItems, totalPrice };
  }

  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  }

  function renderCart() {
    cartItemsEl.innerHTML = '';
    const items = Object.values(cart);
    if (items.length === 0) {
      cartItemsEl.innerHTML = '<p class="empty-cart-message">Корзина пуста.</p>';
    } else {
      items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
          <img src="${it.img}" alt="${it.name}">
          <div class="title">${it.name} — ${it.price} сом</div>
          <div class="qty-controls">
            <button class="btn-qty" data-id="${it.id}" data-delta="-1">-</button>
            <div class="qty">${it.qty}</div>
            <button class="btn-qty" data-id="${it.id}" data-delta="1">+</button>
          </div>`;
        cartItemsEl.appendChild(row);
      });
    }

    const totals = calcTotals();
    cartCountEl.textContent = totals.totalItems;
    cartTotalItemsEl.textContent = totals.totalItems;
    cartTotalPriceEl.textContent = totals.totalPrice.toFixed(2);

    const disabled = totals.totalItems === 0;
    clearCartBtn.disabled = disabled;
    checkoutBtn.disabled = disabled;

    cartItemsEl.querySelectorAll('.btn-qty').forEach(b => {
      b.onclick = () => changeQty(Number(b.dataset.id), Number(b.dataset.delta));
    });

    saveCart();
  }

  function changeQty(id, delta) {
    const key = String(id);
    if (!cart[key]) return;
    cart[key].qty += delta;
    if (cart[key].qty <= 0) delete cart[key];
    renderCart();
  }

  function addToCartFromElement(el) {
    const id = String(el.dataset.id), name = el.dataset.name, price = Number(el.dataset.price), img = el.dataset.img;
    if (!cart[id]) cart[id] = { id: Number(id), name, price, img, qty: 1 };
    else cart[id].qty += 1;
    renderCart();
    showNotification('Товар добавлен в корзину!');
  }

  function filterMenu(category) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      if (category === 'all' || item.dataset.category === category) {
        item.style.display = 'flex';
        setTimeout(() => item.classList.add('show'), 50);
      } else {
        item.classList.remove('show');
        setTimeout(() => item.style.display = 'none', 300);
      }
    });
    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.category === category));
    currentCategory = category;
  }

  function openModal(modal) { modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(modal) { modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = 'auto'; }

  async function sendOrderToGAS(orderData) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyIfq46Xx2A01IbpFijuE7lY0QJvLZGS5MZZQStaWJa3ipzzqMszkSKgA6lVTa7Dgtn/exec'; // вставь свой URL
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const result = await response.json();
      if (result.success) {
        showNotification(result.message);
        cart = {}; saveCart(); renderCart();
        closeModal(orderModal); closeModal(cartModal);
        orderForm.reset(); addressBlock.style.display = 'none';
      } else showNotification('Ошибка: ' + result.message);
    } catch (err) {
      showNotification('Ошибка сети или сервера: ' + err.message);
    }
  }

  orderForm.onsubmit = e => {
    e.preventDefault();
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const deliveryVal = orderForm.querySelector('input[name="delivery"]:checked').value;
    const totals = calcTotals();

    if (!/^[А-Яа-яЁёA-Za-z\s]+$/.test(name)) { showNotification('Имя должно содержать только буквы'); return; }
    if (!/^[0-9]{9}$/.test(phone)) { showNotification('Телефон должен содержать 9 цифр'); return; }
    if (deliveryVal === 'delivery' && !address) { showNotification('Введите адрес доставки'); return; }

    const uniqueId = 'ID' + Date.now();
    const orderData = {
      uniqueId, name, phone, address, delivery: deliveryVal,
      cart: Object.values(cart), totalItems: totals.totalItems,
      totalPrice: totals.totalPrice.toFixed(2),
      clientChatId
    };

    sendOrderToGAS(orderData);
  };

  function initEventListeners() {
    document.querySelectorAll('.menu-item .add-to-cart').forEach(btn => btn.onclick = e => addToCartFromElement(e.target.closest('.menu-item')));
    navButtons.forEach(btn => btn.addEventListener('click', () => filterMenu(btn.dataset.category)));

    cartBtn.onclick = () => openModal(cartModal);
    closeCart.onclick = () => closeModal(cartModal);
    cartModal.onclick = e => { if (e.target === cartModal) closeModal(cartModal); };
    clearCartBtn.onclick = () => { if(confirm('Очистить корзину?')) { cart = {}; renderCart(); showNotification('Корзина очищена'); } };
    checkoutBtn.onclick = () => openModal(orderModal);
    closeOrder.onclick = () => closeModal(orderModal);
    orderModal.onclick = e => { if (e.target === orderModal) closeModal(orderModal); };
    cancelOrderBtn.onclick = () => { closeModal(orderModal); showNotification('Заказ отменён'); };

    orderForm.querySelectorAll('input[name="delivery"]').forEach(r => r.onchange = () => {
      addressBlock.style.display = orderForm.querySelector('input[name="delivery"]:checked').value === 'delivery' ? 'block' : 'none';
    });
  }

  function revealMenuItems() {
    const triggerBottom = window.innerHeight * 0.85;
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.getBoundingClientRect().top < triggerBottom) item.classList.add('show');
    });
  }

  // ===== Инициализация =====
  function init() {
    initEventListeners();
    renderCart();
    window.addEventListener('scroll', revealMenuItems);
    window.addEventListener('load', revealMenuItems);
    filterMenu('all');
  }

  init();
})();