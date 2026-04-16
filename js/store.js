import { db } from './firebase-config.js';
import { collection, query, orderBy, getDocs, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const productsGrid = document.getElementById('productsGrid');
const filterBtns = document.querySelectorAll('.filter-btn');

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('elbadry_cart')) || [];

// Load products
async function loadProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        renderProducts(allProducts);

    } catch (e) {
        console.error("Error loading products: ", e);
        productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--error-color); padding: 50px;">حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من إعداد Firebase بشكل صحيح.</div>`;
    }
}

function renderProducts(products) {
    if (products.length === 0) {
        productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-gray);">لا توجد منتجات في هذا القسم حالياً.</p>`;
        return;
    }

    productsGrid.innerHTML = '';

    products.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${prod.image}" alt="${prod.name}" class="product-img">
            <div class="product-info">
                <div class="product-category">${prod.category}</div>
                <h3 class="product-name">${prod.name}</h3>
                <div class="product-price">${prod.price} ج.م</div>
                <button class="add-to-cart-btn" data-id="${prod.id}" data-name="${prod.name.replace(/"/g, '&quot;')}" data-price="${prod.price}" data-img="${prod.image}">
                    <i class="fa-solid fa-cart-plus"></i> أضف للعربة
                </button>
            </div>
        `;
        productsGrid.appendChild(div);
    });

    // Attach event listeners targeting dynamically created buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            addToCart({
                id: el.dataset.id,
                name: el.dataset.name,
                price: Number(el.dataset.price),
                image: el.dataset.img
            });

            // Visual feedback
            const originalText = el.innerHTML;
            el.innerHTML = '<i class="fa-solid fa-check"></i> تمت الإضافة';
            el.style.background = 'var(--primary-color)';
            el.style.color = 'white';
            setTimeout(() => {
                el.innerHTML = originalText;
                el.style.background = 'rgba(11, 128, 122, 0.1)';
                el.style.color = 'var(--primary-color)';
            }, 1000);
        });
    });
}

// Filtering dynamically from Firebase Categories
const storeFiltersContainer = document.getElementById('storeFiltersContainer');

if (storeFiltersContainer) {
    onSnapshot(query(collection(db, 'categories'), orderBy('createdAt', 'asc')), (snapshot) => {
        storeFiltersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">الكل</button>';
        
        snapshot.forEach(docSnap => {
            const cat = docSnap.data();
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-filter', cat.name);
            btn.textContent = cat.name;
            storeFiltersContainer.appendChild(btn);
        });

        // Re-attach listeners to new filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const filter = e.target.getAttribute('data-filter');
                if (filter === 'all') {
                    renderProducts(allProducts);
                } else {
                    const filtered = allProducts.filter(p => p.category.includes(filter) || filter.includes(p.category));
                    renderProducts(filtered);
                }
            });
        });
    });
}

// ------------- Cart Logic -------------
const cartFloatBtn = document.getElementById('cartFloatBtn');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartBadge = document.getElementById('cartBadge');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalVal = document.getElementById('cartTotalVal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn');

cartFloatBtn.addEventListener('click', () => cartModal.classList.add('active'));
closeCartBtn.addEventListener('click', () => cartModal.classList.remove('active'));
cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.classList.remove('active'); });

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartUI();
}

// Global functions for cart UI manipulation
window.updateQty = function (id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart();
        updateCartUI();
    }
};

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
};

function saveCart() {
    localStorage.setItem('elbadry_cart', JSON.stringify(cart));
}

function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;

    // Update Badge
    cart.forEach(item => totalItems += item.quantity);
    cartBadge.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-gray); margin-top: 50px;">عربة التسوق فارغة.</p>';
        cartTotalVal.textContent = '0 ج.م';
        goToCheckoutBtn.disabled = true;
        goToCheckoutBtn.style.opacity = '0.5';
        return;
    }

    goToCheckoutBtn.disabled = false;
    goToCheckoutBtn.style.opacity = '1';

    let html = '';
    cart.forEach(item => {
        totalPrice += item.price * item.quantity;
        html += `
            <div class="cart-item">
                <img src="${item.image}" alt="" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} ج.م</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQty('${item.id}', 1)"><i class="fa-solid fa-plus" style="font-size:10px;"></i></button>
                        <span style="font-weight: bold; width: 20px; text-align: center;">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQty('${item.id}', -1)"><i class="fa-solid fa-minus" style="font-size:10px;"></i></button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotalVal.textContent = `${totalPrice} ج.م`;
}

// New Inline Checkout Logic
const cartCheckoutContainer = document.getElementById('cartCheckoutContainer');
const cartStandardBtns = document.getElementById('cartStandardBtns');
const cartCheckoutBtns = document.getElementById('cartCheckoutBtns');

goToCheckoutBtn.addEventListener('click', () => {
    cartItemsContainer.style.display = 'none';
    cartCheckoutContainer.style.display = 'block';
    cartStandardBtns.style.display = 'none';
    cartCheckoutBtns.style.display = 'flex';
});

document.getElementById('backToCartBtn').addEventListener('click', () => {
    cartCheckoutContainer.style.display = 'none';
    cartItemsContainer.style.display = 'block';
    cartCheckoutBtns.style.display = 'none';
    cartStandardBtns.style.display = 'block';
});

const submitInlineOrderBtn = document.getElementById('submitInlineOrderBtn');
const inlineForm = document.getElementById('inlineCheckoutForm');
const inlineSpinner = document.getElementById('inlineSpinner');
const inlineBtnText = document.getElementById('inlineBtnText');
const inlineAlertBox = document.getElementById('inlineAlertBox');

submitInlineOrderBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!inlineForm.reportValidity()) return;

    inlineBtnText.style.display = 'none';
    inlineSpinner.style.display = 'inline-block';
    submitInlineOrderBtn.disabled = true;

    let orderDetailsText = "طلب سريع من المتجر:\n";
    let calculatedTotal = 0;
    cart.forEach(item => {
        orderDetailsText += `- ${item.name} | الكمية: ${item.quantity} | السعر: ${item.price} ج.م\n`;
        calculatedTotal += (item.price * item.quantity);
    });
    orderDetailsText += `\nالإجمالي التقريبي: ${calculatedTotal} ج.م\n`;

    const orderData = {
        name: document.getElementById('inlineName').value,
        phone: document.getElementById('inlinePhone').value,
        governorate: document.getElementById('inlineGovernorate').value,
        address: document.getElementById('inlineAddress').value,
        orderDetails: orderDetailsText,
        items: cart,
        total: calculatedTotal,
        status: 'new',
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);

        inlineAlertBox.textContent = 'تم إرسال طلبك بنجاح! السلة تفريغ...';
        inlineAlertBox.style.display = 'block';
        inlineAlertBox.style.background = 'rgba(5, 150, 105, 0.1)';
        inlineAlertBox.style.color = 'var(--success-color)';

        cart = [];
        saveCart();
        updateCartUI();
        inlineForm.reset();

        setTimeout(() => {
            cartModal.classList.remove('active');
            document.getElementById('backToCartBtn').click(); // Reset the view behind the scenes
            inlineAlertBox.style.display = 'none';
            inlineBtnText.style.display = 'inline-block';
            inlineSpinner.style.display = 'none';
            submitInlineOrderBtn.disabled = false;
        }, 2500);

    } catch (error) {
        console.error("Order error: ", error);
        inlineAlertBox.textContent = 'حدث خطأ أثناء الاتصال. حاول مجدداً.';
        inlineAlertBox.style.display = 'block';
        inlineAlertBox.style.background = 'rgba(220, 38, 38, 0.1)';
        inlineAlertBox.style.color = 'var(--error-color)';

        inlineBtnText.style.display = 'inline-block';
        inlineSpinner.style.display = 'none';
        submitInlineOrderBtn.disabled = false;
    }
});

// Initialization
loadProducts();
updateCartUI();
