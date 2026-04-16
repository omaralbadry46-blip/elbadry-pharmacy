import { db, storage } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const orderForm = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const alertBox = document.getElementById('alertBox');
const orderDetailsInput = document.getElementById('orderDetails');

const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');

const prescriptionImageInput = document.getElementById('prescriptionImage');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

let selectedImageFile = null;

if (prescriptionImageInput) {
    prescriptionImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'flex';
            }
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener('click', () => {
        prescriptionImageInput.value = '';
        selectedImageFile = null;
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '';
    });
}

// Check URL Params and LocalStorage Cart
const urlParams = new URLSearchParams(window.location.search);
let cart = JSON.parse(localStorage.getItem('elbadry_cart')) || [];
let cartTotal = 0;

if (urlParams.get('from') === 'cart' && cart.length > 0) {
    let orderDetailsText = "طلب من المتجر:\n";
    cart.forEach(item => {
        orderDetailsText += `- ${item.name} | الكمية: ${item.quantity} | السعر: ${item.price} ج.م\n`;
        cartTotal += (item.price * item.quantity);
    });
    orderDetailsText += `\nالإجمالي التقريبي: ${cartTotal} ج.م\n`;
    orderDetailsInput.value = orderDetailsText;
}

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;
    alertBox.classList.add('hidden');
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const governorate = document.getElementById('governorate').value;
    const address = document.getElementById('address').value || 'غير محدد';
    const orderDetails = orderDetailsInput.value;
    
    let prescriptionUrl = null;
    if (selectedImageFile) {
        try {
            const storageRef = ref(storage, 'prescriptions/' + Date.now() + '_' + selectedImageFile.name);
            const snapshot = await uploadBytes(storageRef, selectedImageFile);
            prescriptionUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Error uploading image: ", error);
        }
    }
    
    const orderData = {
        name,
        phone,
        governorate,
        address,
        orderDetails,
        prescriptionUrl,
        items: cart,
        total: cartTotal,
        status: 'new',
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        
        // Show Success
        alertBox.textContent = 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.';
        alertBox.className = 'alert alert-success';
        
        // Clear Cart and Form
        localStorage.removeItem('elbadry_cart');
        orderForm.reset();
        
        // Redirect to Home after 3 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        
    } catch (error) {
        console.error("Order submission error: ", error);
        alertBox.textContent = 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.';
        alertBox.className = 'alert alert-error';
        
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        submitBtn.disabled = false;
    }
});
