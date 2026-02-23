<template>
  <div class="login-page">
    <div class="bg"></div>

    <div class="layout">
      <!-- Painel esquerdo — branding -->
      <div class="panel-left">
        <div class="brand">
          <div class="brand-mark">
            <div class="brand-icon">✦</div>
            <span class="brand-name">Logos</span>
          </div>
          <div class="brand-tagline">Portal de Estudos Bíblicos</div>
        </div>

        <div class="verse-block">
          <div class="verse-line"></div>
          <div class="verse-text">
            "A tua palavra é <em>lâmpada</em> para os meus pés e <em>luz</em> para o meu caminho."
          </div>
          <div class="verse-ref">Salmos 119 : 105</div>
        </div>

        <div class="features">
          <div class="feature" v-for="f in features" :key="f">
            <div class="feature-dot"></div>
            <span>{{ f }}</span>
          </div>
        </div>
      </div>

      <!-- Painel direito — formulário -->
      <div class="panel-right">
        <div class="form-card">
          <div class="form-header">
            <div class="form-title">Bem-vindo de volta</div>
            <div class="form-subtitle">Entre para continuar seus estudos</div>
          </div>

          <!-- Mensagem de erro -->
          <div v-if="errorMsg" class="error-box">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label>E-mail</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="seu@email.com"
              autocomplete="email"
              :disabled="loading"
              @keyup.enter="handleLogin"
            />
          </div>

          <div class="form-group">
            <label>Senha</label>
            <div class="input-wrapper">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="loading"
                @keyup.enter="handleLogin"
              />
              <button class="eye-btn" type="button" @click="showPassword = !showPassword" tabindex="-1">
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember">
              <input v-model="form.remember" type="checkbox" />
              Lembrar acesso
            </label>
            <RouterLink to="/esqueci-senha" class="forgot">Esqueci minha senha</RouterLink>
          </div>

          <button class="btn-primary" :disabled="loading" @click="handleLogin">
            <span v-if="!loading">Entrar no portal</span>
            <span v-else class="loading-dots">Entrando<span>.</span><span>.</span><span>.</span></span>
          </button>

          <div class="divider">ou continue com</div>

          <button class="btn-secondary" :disabled="loading" @click="handleGoogle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          <div class="register-cta">
            Ainda não tem conta?
            <RouterLink to="/cadastro" class="register-link">Cadastre-se grátis</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const form = reactive({ email: '', password: '', remember: false })
const loading     = ref(false)
const showPassword = ref(false)
const errorMsg    = ref('')

const features = [
  'Referências cruzadas automáticas por tema',
  'Marcações e notas pessoais de estudo',
  'Exportação completa em PDF',
  'Estudos organizados e modulares',
]

async function handleLogin() {
  errorMsg.value = ''
  if (!form.email || !form.password) {
    errorMsg.value = 'Preencha e-mail e senha para continuar.'
    return
  }
  loading.value = true
  try {
    await auth.login(form.email, form.password)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'E-mail ou senha inválidos.'
  } finally {
    loading.value = false
  }
}

function handleGoogle() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --cream: #F9F6F0; --warm-white: #FDFBF8; --ink: #1C1A17;
  --ink-soft: #4A4540; --ink-muted: #9C9590; --gold: #B8965A;
  --gold-light: #D4B07A; --sage: #8A9E8C; --border: rgba(28,26,23,0.1);
}

.login-page {
  min-height: 100vh;
  background: #F9F6F0;
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
  position: relative;
}

.bg {
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 110%, rgba(184,150,90,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 85% -10%, rgba(138,158,140,0.08) 0%, transparent 55%),
    #F9F6F0;
  z-index: 0;
}

.layout {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

/* ── Painel esquerdo ──────────────────────────────────── */
.panel-left {
  display: flex; flex-direction: column;
  justify-content: space-between;
  padding: 3rem;
  border-right: 1px solid rgba(28,26,23,0.1);
  position: relative; overflow: hidden;
}

.panel-left::before {
  content: '';
  position: absolute; top: -60px; left: -60px;
  width: 320px; height: 320px;
  border-radius: 50%;
  border: 1px solid rgba(184,150,90,0.15);
  animation: pulse 6s ease-in-out infinite;
}

.panel-left::after {
  content: '';
  position: absolute; top: -30px; left: -30px;
  width: 180px; height: 180px;
  border-radius: 50%;
  border: 1px solid rgba(184,150,90,0.20);
  animation: pulse 6s ease-in-out infinite 1s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%       { transform: scale(1.05); opacity: 1; }
}

.brand { position: relative; z-index: 1; }
.brand-mark { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #B8965A, #D4B07A);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(184,150,90,0.25);
}
.brand-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.6rem; font-weight: 600;
  letter-spacing: 0.05em; color: #1C1A17;
}
.brand-tagline {
  font-size: 0.75rem; color: #9C9590;
  letter-spacing: 0.12em; text-transform: uppercase;
  margin-left: calc(36px + 0.75rem);
}

.verse-block {
  position: relative; z-index: 1;
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; padding: 3rem 0;
}
.verse-line { width: 32px; height: 2px; background: #B8965A; margin-bottom: 2rem; border-radius: 2px; }
.verse-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.6rem; line-height: 1.25;
  font-weight: 300; font-style: italic;
  color: #1C1A17; margin-bottom: 1.5rem; max-width: 400px;
}
.verse-text em { font-style: normal; color: #B8965A; }
.verse-ref { font-size: 0.78rem; letter-spacing: 0.15em; text-transform: uppercase; color: #9C9590; }

.features { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.75rem; }
.feature { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #4A4540; }
.feature-dot { width: 6px; height: 6px; border-radius: 50%; background: #8A9E8C; flex-shrink: 0; }

/* ── Painel direito ───────────────────────────────────── */
.panel-right {
  display: flex; align-items: center; justify-content: center;
  padding: 3rem;
  background: #FDFBF8;
}

.form-card {
  width: 100%; max-width: 380px;
  animation: fadeUp 0.7s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.form-header { margin-bottom: 2rem; }
.form-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem; font-weight: 600;
  color: #1C1A17; margin-bottom: 0.4rem;
}
.form-subtitle { font-size: 0.85rem; color: #9C9590; font-weight: 300; }

.error-box {
  background: rgba(196,122,122,0.12);
  border: 1px solid rgba(196,122,122,0.3);
  color: #8B3535;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  margin-bottom: 1.25rem;
  animation: fadeUp 0.3s ease;
}

.form-group { margin-bottom: 1.25rem; }

label {
  display: block;
  font-size: 0.72rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4A4540;
  margin-bottom: 0.5rem; font-weight: 500;
}

.input-wrapper { position: relative; }
.eye-btn {
  position: absolute; right: 0.75rem; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  font-size: 0.85rem; cursor: pointer; opacity: 0.5;
  transition: opacity 0.2s;
  padding: 0;
}
.eye-btn:hover { opacity: 1; }

input[type="email"],
input[type="password"],
input[type="text"] {
  width: 100%; padding: 0.85rem 1rem;
  background: #F9F6F0;
  border: 1px solid rgba(28,26,23,0.1);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem; color: #1C1A17;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
input:focus {
  border-color: #B8965A;
  background: #FDFBF8;
  box-shadow: 0 0 0 3px rgba(184,150,90,0.12);
}
input::placeholder { color: #9C9590; }
input:disabled { opacity: 0.6; cursor: not-allowed; }

.form-options {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem; margin-top: 0.25rem;
}
.remember {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.8rem; color: #4A4540;
  cursor: pointer; user-select: none;
}
.remember input[type="checkbox"] {
  width: 16px; height: 16px; padding: 0;
  accent-color: #B8965A; cursor: pointer;
}
.forgot { font-size: 0.8rem; color: #B8965A; text-decoration: none; transition: opacity 0.2s; }
.forgot:hover { opacity: 0.7; }

.btn-primary {
  width: 100%; padding: 0.95rem;
  background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.88rem; font-weight: 500;
  letter-spacing: 0.05em; cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  position: relative; overflow: hidden;
}
.btn-primary:hover:not(:disabled) {
  background: #B8965A;
  box-shadow: 0 6px 20px rgba(184,150,90,0.30);
  transform: translateY(-1px);
}
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.loading-dots span {
  animation: blink 1.2s infinite;
  opacity: 0;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

.divider {
  display: flex; align-items: center;
  gap: 1rem; margin: 1.75rem 0;
  color: #9C9590; font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(28,26,23,0.1);
}

.btn-secondary {
  width: 100%; padding: 0.9rem;
  background: transparent; color: #4A4540;
  border: 1px solid rgba(28,26,23,0.1);
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.btn-secondary:hover:not(:disabled) {
  border-color: #B8965A;
  color: #1C1A17;
  background: rgba(184,150,90,0.04);
}
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

.register-cta {
  text-align: center; margin-top: 2rem;
  font-size: 0.82rem; color: #9C9590;
}
.register-link { color: #B8965A; text-decoration: none; font-weight: 500; transition: opacity 0.2s; }
.register-link:hover { opacity: 0.7; }

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .panel-left { display: none; }
  .panel-right { background: #F9F6F0; padding: 2rem 1.5rem; }
}
</style>
