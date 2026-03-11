<template>
    <div class="app-layout">

        <!-- Sidebar -->
        <aside class="app-sidebar" :class="{ collapsed }">
            <div class="sidebar-brand">
                <div class="brand-icon">✦</div>
                <span class="brand-name" v-if="!collapsed">Logos</span>
            </div>

            <nav class="sidebar-nav">
                <RouterLink to="/busca" class="nav-item" title="Busca">
                    <span class="nav-icon">🔍</span>
                    <span class="nav-label" v-if="!collapsed">Busca</span>
                </RouterLink>
                
                <RouterLink to="/" class="nav-item" title="Dashboard">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-label" v-if="!collapsed">Dashboard</span>
                </RouterLink>
                <RouterLink to="/leitura" class="nav-item" title="Bíblia">
                    <span class="nav-icon">📖</span>
                    <span class="nav-label" v-if="!collapsed">Bíblia</span>
                </RouterLink>
                <RouterLink to="/notas" class="nav-item" title="Notas">
                    <span class="nav-icon">📝</span>
                    <span class="nav-label" v-if="!collapsed">Notas</span>
                </RouterLink>
            </nav>

            <div class="sidebar-footer">
                <RouterLink to="/perfil" class="nav-item" title="Perfil">
                    <span class="nav-icon">👤</span>
                    <span class="nav-label" v-if="!collapsed">{{ auth.user?.name?.split(' ')[0] || 'Perfil' }}</span>
                </RouterLink>
                <button class="nav-item logout-btn" @click="handleLogout" title="Sair">
                    <span class="nav-icon">🚪</span>
                    <span class="nav-label" v-if="!collapsed">Sair</span>
                </button>
            </div>
        </aside>

        <!-- Conteúdo principal -->
        <main class="app-main">
            <RouterView />
        </main>

    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { RouterLink, RouterView } from 'vue-router'
    import { useAuthStore } from '@/modules/auth/stores/auth.store'

    const auth = useAuthStore()
    const collapsed = ref(false)
    const router = useRouter()
    import { useRouter } from 'vue-router'

    async function handleLogout() {
        await auth.logout()
        router.push('/login')
    }
</script>

<style scoped>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@400;500&display=swap');

    .app-layout {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: #F9F6F0;
        font-family: 'DM Sans', sans-serif;
    }

    /* ── Sidebar ─────────────────────────────────────────────── */
    .app-sidebar {
        width: 220px;
        flex-shrink: 0;
        background: #1C1A17;
        display: flex;
        flex-direction: column;
        transition: width 0.25s ease;
        overflow: hidden;
    }

    .app-sidebar.collapsed {
        width: 60px;
    }

    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.5rem 1rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        min-height: 64px;
    }

    .brand-icon {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        background: linear-gradient(135deg, #B8965A, #D4B07A);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
    }

    .brand-name {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.3rem;
        font-weight: 600;
        color: #F9F6F0;
        white-space: nowrap;
    }

    .sidebar-nav {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0.75rem 0.5rem;
        gap: 0.25rem;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        border-radius: 8px;
        text-decoration: none;
        color: rgba(255, 255, 255, 0.55);
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
        font-size: 0.85rem;
    }

    .nav-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
    }

    .nav-item.router-link-active {
        background: rgba(184, 150, 90, 0.2);
        color: #D4B07A;
    }

    .nav-icon {
        font-size: 1rem;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
    }

    .nav-label {
        font-weight: 400;
    }

    .sidebar-footer {
        padding: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .collapse-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.3);
        font-size: 1.1rem;
        border-radius: 6px;
        transition: color 0.2s, background 0.2s;
    }

    .collapse-btn:hover {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.06);
    }

    /* ── Main ────────────────────────────────────────────────── */
    .app-main {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .logout-btn {
        background: none;
        border: none;
        width: 100%;
        cursor: pointer;
        text-align: left;
        color: rgba(255, 255, 255, 0.55);
    }

    .logout-btn:hover {
        background: rgba(196, 122, 122, 0.15);
        color: #C47A7A;
    }

</style>