import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Check Auth state immediately
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'admin.html';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'admin.html';
    });
});

// Collections
const productsCol = collection(db, 'products');
const ordersCol = collection(db, 'orders');

// DOM Elements
const productsTableBody = document.querySelector('#productsTable tbody');
const totalProductsCount = document.getElementById('totalProductsCount');
const totalOrdersCount = document.getElementById('totalOrdersCount');

const recentOrdersBody = document.querySelector('#recentOrdersTable tbody');
const allOrdersBody = document.querySelector('#allOrdersTable tbody');

// Form Submit (Add/Edit Product)
const productForm = document.getElementById('productForm');
const saveBtn = document.getElementById('saveProductBtn');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.innerHTML = 'جاري الحفظ... <span class="spinner"></span>';
    saveBtn.disabled = true;

    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;
    const image = document.getElementById('productImage').value || 'https://via.placeholder.com/150';

    const productData = { name, price: Number(price), category, image };

    try {
        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            productData.createdAt = new Date();
            await addDoc(productsCol, productData);
        }
        document.getElementById('productModal').classList.remove('active');
        productForm.reset();
    } catch (error) {
        console.error("Error saving product: ", error);
        alert('حدث خطأ أثناء حفظ المنتج، يرجى التأكد من صلاحيات Firebase (Firestore Rules).');
    } finally {
        saveBtn.innerHTML = 'حفظ المنتج';
        saveBtn.disabled = false;
    }
});

// Global functions for inline HTML buttons
window.editProduct = function(id, name, price, category, image) {
    document.getElementById('productId').value = id;
    document.getElementById('productName').value = name;
    document.getElementById('productPrice').value = price;
    document.getElementById('productCategory').value = category;
    document.getElementById('productImage').value = image;
    document.getElementById('modalTitle').textContent = 'تعديل منتج';
    document.getElementById('productModal').classList.add('active');
};

window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        await deleteDoc(doc(db, 'products', id));
    }
};

window.viewOrder = function(id, name, phone, address, items, total, status, prescriptionUrl) {
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    const actionDiv = document.getElementById('orderActionDiv');
    
    let itemsHtml = ``;
    try {
        let parsedItems = JSON.parse(decodeURIComponent(items));
        itemsHtml = `<ul>`;
        parsedItems.forEach(item => {
            itemsHtml += `<li>${item.name} - الكمية: ${item.quantity} - ${item.price} ج.م</li>`;
        });
        itemsHtml += `</ul>`;
    } catch(e) {
        itemsHtml = `<div style="white-space: pre-wrap; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 5px; border: 1px solid var(--border-color);">${decodeURIComponent(items)}</div>`; // Fallback for textual strings
    }
    
    let prescriptionHtml = '';
    if (prescriptionUrl && prescriptionUrl !== 'undefined' && prescriptionUrl !== 'null' && prescriptionUrl.length > 5) {
        prescriptionHtml = `
            <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border-color);">
            <p><strong>صورة الروشتة المرفقة:</strong></p>
            <a href="${prescriptionUrl}" target="_blank">
                <img src="${prescriptionUrl}" style="max-width: 100%; max-height: 250px; border-radius: 10px; margin-top: 10px; border: 1px solid var(--border-color);">
            </a>
        `;
    }

    content.innerHTML = `
        <p><strong>اسم العميل:</strong> ${name}</p>
        <p><strong>رقم الهاتف:</strong> <a href="tel:${phone}" dir="ltr">${phone}</a></p>
        <p><strong>العنوان:</strong> ${address}</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border-color);">
        <p><strong>الطلب / المنتجات:</strong></p>
        ${itemsHtml}
        <p style="font-size: 18px; color: var(--primary-color);"><strong>الإجمالي:</strong> ${total} ج.م</p>
        ${prescriptionHtml}
    `;

    if (status === 'new') {
        actionDiv.innerHTML = `<button class="btn-primary" onclick="markOrderDone('${id}')">تحديد كـ "مكتمل"</button>`;
    } else {
        actionDiv.innerHTML = `<span style="color: var(--success-color); font-weight: bold;"><i class="fa-solid fa-check-circle"></i> هذا الطلب مكتمل</span>`;
    }

    modal.classList.add('active');
};

window.markOrderDone = async function(id) {
    await updateDoc(doc(db, 'orders', id), { status: 'done' });
    document.getElementById('orderDetailsModal').classList.remove('active');
};

// Real-time listener for Products
onSnapshot(query(productsCol, orderBy('createdAt', 'desc')), (snapshot) => {
    productsTableBody.innerHTML = '';
    totalProductsCount.textContent = snapshot.size;
    
    snapshot.forEach((docSnap) => {
        const prod = docSnap.data();
        const id = docSnap.id;
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><img src="${prod.image}" width="50" height="50" style="border-radius:8px; object-fit:cover;"></td>
            <td><strong>${prod.name}</strong></td>
            <td>${prod.category}</td>
            <td>${prod.price} ج.م</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${id}', '${prod.name.replace(/'/g, "\\'")}', '${prod.price}', '${prod.category}', '${prod.image}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
});

// Real-time listener for Orders
onSnapshot(query(ordersCol, orderBy('createdAt', 'desc')), (snapshot) => {
    recentOrdersBody.innerHTML = '';
    allOrdersBody.innerHTML = '';
    totalOrdersCount.textContent = snapshot.size;
    
    let count = 0;
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        const id = docSnap.id;
        const statusBadge = order.status === 'done' 
            ? `<span class="status-badge status-done">مكتمل</span>` 
            : `<span class="status-badge status-new">جديد</span>`;
            
        const dateObj = order.createdAt ? order.createdAt.toDate() : new Date();
        const dateStr = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

        let itemsToPass = order.orderDetails || "لا توجد تفاصيل";
        if (order.items && order.items.length > 0) {
            itemsToPass = JSON.stringify(order.items);
        }
        const safeItems = encodeURIComponent(itemsToPass);
        const total = order.total || 0;
        const prescriptionUrl = order.prescriptionUrl || '';

        // Add to All orders
        const allTr = document.createElement('tr');
        allTr.innerHTML = `
            <td dir="ltr" style="font-size:14px; color:var(--text-gray)">${dateStr}</td>
            <td><strong>${order.name}</strong></td>
            <td dir="ltr">${order.phone}</td>
            <td><button class="btn-outline" style="padding: 5px 10px; font-size:13px;" onclick="viewOrder('${id}', '${order.name}', '${order.phone}', '${order.address}', '${safeItems}', '${total}', '${order.status || 'new'}', '${prescriptionUrl}')">التفاصيل</button></td>
            <td>${statusBadge}</td>
            <td>
                ${order.status !== 'done' ? `<button class="action-btn" style="color:var(--success-color)" title="إكمال" onclick="markOrderDone('${id}')"><i class="fa-solid fa-check"></i></button>` : ''}
            </td>
        `;
        allOrdersBody.appendChild(allTr);

        // Add to Recent orders (limit 5)
        if (count < 5) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:monospace; color:var(--text-gray)">${id.substring(0, 6)}...</td>
                <td><strong>${order.name}</strong></td>
                <td dir="ltr" style="font-size:14px;">${dateStr}</td>
                <td>${statusBadge}</td>
            `;
            recentOrdersBody.appendChild(tr);
            count++;
        }
    });

    if (snapshot.empty) {
        recentOrdersBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">لا توجد طلبات حتى الآن.</td></tr>`;
        allOrdersBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا توجد طلبات حتى الآن.</td></tr>`;
    }
});
