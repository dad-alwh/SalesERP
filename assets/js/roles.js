
function roleManager() {
    return {
       
        roles: [],
        availableModels: ['User', 'Role', 'Permission', 'Customer', 'Product', 'Invoice', 'InvoiceProduct'],
        currentUser: { name: '', role_name: '' },
        selectedPermissions: [], 
       
        loading: {
            roles: false,
            permissions: false,
            saving: false
        },
        searchQuery: '',
        selectedId: null,
        modalOpen: false,
        isEdit: false,
        
        
        form: {
            id: null,
            name: '',
            status: 'active',
            parent_role_id: null,
            permissions: [] 
        },

        message: { show: false, text: '', type: 'info' },
        confirmation: { show: false, text: '', action: null },

        async init() {
            this.currentUser = typeof auth !== 'undefined' ? auth.getUser() : { name: 'زائر', role_name: 'بدون صلاحية' };
            await this.fetchRoles();

            this.$watch('selectedId', async (value) => {
                if (value) await this.fetchRolePermissions(value);
                else this.selectedPermissions = [];
            });
        },

        async fetchRoles() {
            this.loading.roles = true;
            try {
                const data = await apiFetch('roles');
                this.roles = data || [];
            } catch (error) {
                this.showToast('حدث خطأ أثناء تحميل الأدوار', 'error');
            } finally {
                this.loading.roles = false;
            }
        },

        async fetchRolePermissions(roleId) {
            this.loading.permissions = true;
            try {
                const data = await apiFetch(`permissions?role_id=${roleId}`);
                this.selectedPermissions = data || [];
            } catch (error) {
                console.error('Error fetching permissions:', error);
            } finally {
                this.loading.permissions = false;
            }
        },


        get filteredRoles() {
            if (!this.searchQuery) return this.roles;
            const q = this.searchQuery.toLowerCase();
            return this.roles.filter(r => r.name.toLowerCase().includes(q));
        },

        getParentRoleName(parentId) {
            if (!parentId) return 'لا يوجد (جذر)';
            const parent = this.roles.find(r => r.id === parentId);
            return parent ? parent.name : 'دور غير معروف';
        },

        getSelectedRoleName() {
            const role = this.roles.find(r => r.id === this.selectedId);
            return role ? role.name : '';
        },

        formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('ar-EG');
        },

        translateStatus(status) {
            return status === 'active' ? 'مفعل' : 'غير مفعل';
        },

        initDefaultPermissions() {
            return this.availableModels.map(model => ({
                model_name: model,
                create: false,
                read: false,
                update: false,
                delete: false
            }));
        },

        openAddModal() {
            this.isEdit = false;
            this.form = {
                name: '',
                status: 'active',
                parent_role_id: null, 
                permissions: this.initDefaultPermissions()
            };
            this.modalOpen = true;
        },

        async openEditModal() {
            if (!this.selectedId) return;
            this.loading.saving = true;
            try {
                const role = this.roles.find(r => r.id === this.selectedId);
                const currentPerms = await apiFetch(`permissions?role_id=${this.selectedId}`);
                
                this.isEdit = true;
                this.form = {
                    id: role.id,
                    name: role.name,
                    status: role.status,
                    parent_role_id: role.parent_role_id,
                    permissions: this.availableModels.map(model => {
                        const found = currentPerms.find(p => p.model_name === model);
                        return found ? { ...found } : { model_name: model, create: false, read: false, update: false, delete: false };
                    })
                };
                this.modalOpen = true;
            } catch (error) {
                this.showToast('فشل في تحميل تفاصيل الدور', 'error');
            } finally {
                this.loading.saving = false;
            }
        },

        isFormValid() {
            return this.form.name.length >= 3;
        },

        async saveRole() {
            if (this.loading.saving) return;
            this.loading.saving = true;
            try {
                const method = this.isEdit ? 'PUT' : 'POST';
                const endpoint = this.isEdit ? `roles/${this.form.id}` : 'roles';
                const response = await apiFetch(endpoint, method, this.form);
                
                if (response) {
                    this.showToast(this.isEdit ? 'تم تحديث الدور بنجاح' : 'تم إنشاء الدور بنجاح', 'success');
                    await this.fetchRoles();
                    this.modalOpen = false;
                    this.selectedId = response.id || this.selectedId;
                }
            } catch (error) {
                this.showToast('حدث خطأ أثناء الحفظ', 'error');
            } finally {
                this.loading.saving = false;
            }
        },

        confirmDelete() {
            if (!this.selectedId) return;
            const role = this.roles.find(r => r.id === this.selectedId);
            if (role && role.name.toLowerCase() === 'admin') {
                this.showToast('لا يمكن حذف دور المسؤول (Admin)', 'error');
                return;
            }

            this.confirmation = {
                show: true,
                text: `هل أنت متأكد من حذف الدور "${role.name}"؟ سيؤثر هذا على المستخدمين المرتبطين به.`,
                action: () => this.deleteRole()
            };
        },

        async deleteRole() {
            try {
                await apiFetch(`roles/${this.selectedId}`, 'DELETE');
                this.showToast('تم حذف الدور بنجاح', 'success');
                this.roles = this.roles.filter(r => r.id !== this.selectedId);
                this.selectedId = null;
            } catch (error) {
                this.showToast('لا يمكن حذف هذا الدور لوجود قيود عليه', 'error');
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
            return auth.can(model, action);
        }
    };
}