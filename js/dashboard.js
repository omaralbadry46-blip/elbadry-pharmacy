import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

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
const categoriesCol = collection(db, 'categories');

// DOM Elements
const productsTableBody = document.querySelector('#productsTable tbody');
const totalProductsCount = document.getElementById('totalProductsCount');
const totalOrdersCount = document.getElementById('totalOrdersCount');

const recentOrdersBody = document.querySelector('#recentOrdersTable tbody');
const allOrdersBody = document.querySelector('#allOrdersTable tbody');

// Categories Elements
const categoriesModal = document.getElementById('categoriesModal');
const openCategoriesModal = document.getElementById('openCategoriesModal');
const closeCategoriesModal = document.getElementById('closeCategoriesModal');
const categoriesList = document.getElementById('categoriesList');
const productCategory = document.getElementById('productCategory');
const newCategoryName = document.getElementById('newCategoryName');
const addCategoryBtn = document.getElementById('addCategoryBtn');

if (openCategoriesModal) {
    openCategoriesModal.addEventListener('click', () => categoriesModal.classList.add('active'));
    closeCategoriesModal.addEventListener('click', () => categoriesModal.classList.remove('active'));
}

// Form Submit (Add/Edit Product)
const productForm = document.getElementById('productForm');
const saveBtn = document.getElementById('saveProductBtn');

// Product Image Upload Elements
const productImageFile = document.getElementById('productImageFile');
const productImagePreviewContainer = document.getElementById('productImagePreviewContainer');
const productImagePreview = document.getElementById('productImagePreview');
let selectedProductImageFile = null;

if (productImageFile) {
    productImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedProductImageFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                productImagePreview.src = e.target.result;
                productImagePreviewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
}
const productImageUrlInput = document.getElementById('productImage');
if (productImageUrlInput) {
    productImageUrlInput.addEventListener('input', (e) => {
        if (!selectedProductImageFile && e.target.value) {
            productImagePreview.src = e.target.value;
            productImagePreviewContainer.style.display = 'block';
        }
    });
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.innerHTML = 'جاري الحفظ... <span class="spinner"></span>';
    saveBtn.disabled = true;

    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;
    let image = document.getElementById('productImage').value || 'https://via.placeholder.com/150';

    try {
        if (selectedProductImageFile) {
            const storageRef = ref(storage, 'products/' + Date.now() + '_' + selectedProductImageFile.name);
            const snapshot = await uploadBytes(storageRef, selectedProductImageFile);
            image = await getDownloadURL(snapshot.ref);
        }

        const productData = { name, price: Number(price), category, image };

        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
        } else {
            productData.createdAt = new Date();
            await addDoc(productsCol, productData);
        }
        document.getElementById('productModal').classList.remove('active');
        productForm.reset();
        
        // Reset image selection
        selectedProductImageFile = null;
        if(productImageFile) productImageFile.value = '';
        productImagePreviewContainer.style.display = 'none';
        document.getElementById('productImage').value = '';
        
    } catch (error) {
        console.error("Error saving product: ", error);
        alert('حدث خطأ أثناء إتمام العملية.');
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
    
    // Show old image preview
    if (image && image !== 'https://via.placeholder.com/150') {
        productImagePreview.src = image;
        productImagePreviewContainer.style.display = 'block';
    } else {
        productImagePreviewContainer.style.display = 'none';
    }
    
    // Clear file selection cache
    selectedProductImageFile = null;
    if(productImageFile) productImageFile.value = '';
    
    document.getElementById('modalTitle').textContent = 'تعديل منتج';
    document.getElementById('productModal').classList.add('active');
};

window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        await deleteDoc(doc(db, 'products', id));
    }
};

window.viewOrder = function(id, name, phone, governorate, address, items, total, status, prescriptionUrl) {
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
        <p><strong>المحافظة:</strong> <span style="color: var(--primary-color); font-weight: bold;">${governorate !== 'undefined' ? governorate : 'غير محدد'}</span></p>
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

window.deleteCategory = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟ (لن يتم حذف المنتجات الموجودة به تلقائياً)')) {
        await deleteDoc(doc(db, 'categories', id));
    }
};

// Real-time listener for Categories
onSnapshot(query(categoriesCol, orderBy('createdAt', 'asc')), async (snapshot) => {
    if (snapshot.empty) {
        const defaults = ['أدوية', 'مستحضرات تجميل', 'إكسسوارات طبية'];
        for (let cat of defaults) {
            await addDoc(categoriesCol, { name: cat, createdAt: new Date() });
        }
        return;
    }

    categoriesList.innerHTML = '';
    productCategory.innerHTML = '';

    snapshot.forEach(docSnap => {
        const cat = docSnap.data();
        const id = docSnap.id;
        
        // Modal List
        const li = document.createElement('li');
        li.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,0,0,0.02); margin-bottom: 8px; border-radius: 8px; border: 1px solid var(--border-color);";
        li.innerHTML = `
            <span style="font-weight: bold;">${cat.name}</span>
            <button onclick="deleteCategory('${id}')" style="background: var(--error-color); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
        `;
        categoriesList.appendChild(li);

        // Filter Select Options
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        productCategory.appendChild(option);
    });
});

if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', async () => {
        const val = newCategoryName.value.trim();
        if (val) {
            addCategoryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            addCategoryBtn.disabled = true;
            await addDoc(categoriesCol, { name: val, createdAt: new Date() });
            newCategoryName.value = '';
            addCategoryBtn.textContent = 'إضافة';
            addCategoryBtn.disabled = false;
        }
    });
}

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

        const governorate = order.governorate || 'غير محدد';

        // Add to All orders
        const allTr = document.createElement('tr');
        allTr.innerHTML = `
            <td dir="ltr" style="font-size:14px; color:var(--text-gray)">${dateStr}</td>
            <td><strong>${order.name}</strong><div style="font-size: 12px; color: var(--primary-color)">${governorate}</div></td>
            <td dir="ltr">${order.phone}</td>
            <td><button class="btn-outline" style="padding: 5px 10px; font-size:13px;" onclick="viewOrder('${id}', '${order.name.replace(/'/g, "\\'")}', '${order.phone}', '${governorate}', '${order.address.replace(/'/g, "\\'")}', '${safeItems}', '${total}', '${order.status || 'new'}', '${prescriptionUrl}')">التفاصيل</button></td>
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
