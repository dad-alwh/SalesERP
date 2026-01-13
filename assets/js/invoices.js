function invoiceManager() {
    return {
        // Data Models
        invoices: [],
        customers: [],
        products: [],
        currentUser: { name: '', role_name: '' },
        
        // UI States
        loading: {
            invoices: false,
            saving: false
        },
        searchQuery: '',
        selectedId: null,
        modalOpen: false,
        viewModalOpen: false,
        isEdit: false,
        
        form: {
            id: null,
            customer_id: '',
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount: 0,
            status: 'pending',
            invoice_products: [] // UI uses this structure
        },
        
        message: { show: false, text: '', type: 'info' },
        confirmation: { show: false, text: '', action: null },

        async init() {
            this.currentUser = typeof auth !== 'undefined' ? auth.getUser() : { name: 'Guest', role_name: '' };
            await this.fetchInitialData();
        },

        async fetchInitialData() {
            this.loading.invoices = true;
            try {
                const [invoicesData, customersData, productsData] = await Promise.all([
                    apiFetch('invoices'),
                    apiFetch('customers'),
                    apiFetch('products')
                ]);
                this.invoices = invoicesData || [];
                this.customers = customersData || [];
                this.products = productsData || [];
            } catch (error) {
                this.showToast('حدث خطأ أثناء تحميل البيانات', 'error');
            } finally {
                this.loading.invoices = false;
            }
        },

        get filteredInvoices() {
            if (!this.searchQuery) return this.invoices;
            const q = this.searchQuery.toLowerCase();
            return this.invoices.filter(inv => 
                inv.id.toString().includes(q) || 
                this.getCustomerName(inv.customer_id).toLowerCase().includes(q)
            );
        },

        get selectedInvoice() {
            return this.invoices.find(inv => inv.id === this.selectedId);
        },

        getCustomerName(id) {
            const customer = this.customers.find(c => c.id === id);
            return customer ? customer.name : 'عميل غير معروف';
        },

        getProductName(id) {
            const product = this.products.find(p => p.id === id);
            return product ? product.name : 'منتج غير موجود';
        },

        getProductPrice(id) {
            const product = this.products.find(p => p.id === id);
            return product ? product.price : 0;
        },

        formatCurrency(val) {
            return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val);
        },

        formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('ar-EG');
        },

        translateStatus(status) {
            const map = { 'pending': 'معلقة', 'paid': 'تم الدفع', 'refused': 'مرفوضة' };
            return map[status] || status;
        },

        addItem() {
            this.form.invoice_products.push({
                product_id: '',
                quantity: 1,
                amount: 0
            });
        },

        removeItem(index) {
            this.form.invoice_products.splice(index, 1);
            this.calculateTotals();
        },

        updateItemPrice(index) {
            const item = this.form.invoice_products[index];
            const price = this.getProductPrice(item.product_id);
            item.amount = price * item.quantity;
            this.calculateTotals();
        },

        calculateTotals() {
            this.form.invoice_products.forEach(item => {
                const price = this.getProductPrice(item.product_id);
                item.amount = price * item.quantity;
            });
            this.form.total_amount = this.form.invoice_products.reduce((sum, item) => sum + item.amount, 0);
        },

        isFormValid() {
            return this.form.customer_id && 
                   this.form.invoice_date && 
                   this.form.invoice_products.length > 0 &&
                   this.form.invoice_products.every(p => p.product_id && p.quantity > 0);
        },

        openAddModal() {
            this.isEdit = false;
            this.form = {
                customer_id: '',
                invoice_date: new Date().toISOString().split('T')[0],
                total_amount: 0,
                status: 'pending',
                invoice_products: [{ product_id: '', quantity: 1, amount: 0 }]
            };
            this.modalOpen = true;
        },

        openEditModal() {
            if (!this.selectedId) return;
            const inv = JSON.parse(JSON.stringify(this.selectedInvoice));
            this.isEdit = true;
            this.form = inv;
            if (inv.items) {
                this.form.invoice_products = inv.items;
            }
            this.modalOpen = true;
        },

        openViewModal() {
            if (!this.selectedId) return;
            this.viewModalOpen = true;
        },

        async saveInvoice() {
            this.loading.saving = true;
            try {
                const method = this.isEdit ? 'PUT' : 'POST';
                const endpoint = this.isEdit ? `invoices/${this.form.id}` : 'invoices';
                
                const payload = {
                    ...this.form,
                    items: this.form.invoice_products.map(p => ({
                        product_id: p.product_id,
                        quantity: Number(p.quantity)
                    }))
                };
                delete payload.invoice_products;

                const response = await apiFetch(endpoint, {
                    method: method,
                    body: payload
                });
                
                if (response) {
                    this.showToast(this.isEdit ? 'تم تحديث الفاتورة بنجاح' : 'تم إنشاء الفاتورة بنجاح', 'success');
                    this.modalOpen = false;
                    this.selectedId = response.id || this.selectedId;
                    await this.fetchInitialData();
                }
            } catch (error) {
                console.error(error);
                const errorMsg = error.message || 'خطأ أثناء حفظ الفاتورة';
                this.showToast(errorMsg, 'error');
            } finally {
                this.loading.saving = false;
            }
        },

        confirmDelete() {
            if (!this.selectedId) return;
            this.confirmation = {
                show: true,
                text: `هل أنت متأكد من حذف الفاتورة رقم INV-${this.selectedId}؟`,
                action: () => this.deleteInvoice()
            };
        },

        async deleteInvoice() {
            try {
                await apiFetch(`invoices/${this.selectedId}`, { method: 'DELETE' });
                this.showToast('تم حذف الفاتورة بنجاح', 'success');
                this.invoices = this.invoices.filter(i => i.id !== this.selectedId);
                this.selectedId = null;
            } catch (error) {
                this.showToast('لا يمكن حذف هذه الفاتورة', 'error');
            }
        },

        async changeStatus(newStatus) {
            if (!this.selectedId) return;
            try {
                await apiFetch(`invoices/${this.selectedId}`, { 
                    method: 'PATCH',
                    body: { status: newStatus }
                });
                this.showToast(`تم تغيير حالة الفاتورة إلى: ${this.translateStatus(newStatus)}`, 'info');
                const inv = this.invoices.find(i => i.id === this.selectedId);
                if (inv) inv.status = newStatus;
            } catch (error) {
                this.showToast('فشل في تغيير الحالة: قد لا تملك الصلاحية', 'error');
            }
        },

        showToast(text, type = 'info') {
            this.message = { show: true, text, type };
            setTimeout(() => this.message.show = false, 3000);
        },

        handleLogout() {
            if (typeof auth !== 'undefined') auth.logout();
            window.location.href = 'index.html';
        },

        can(model, action) {
            if (typeof auth === 'undefined') return true; 
            return auth.can(action, model);
        }
    };
}
