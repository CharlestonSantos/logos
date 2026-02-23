<template>
  <div class="register-page">
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
            "Estuda para te apresentares a Deus <em>aprovado</em>, como obreiro que não tem de que se <em>envergonhar</em>."
          </div>
          <div class="verse-ref">2 Timóteo 2 : 15</div>
        </div>

        <div class="steps">
          <div class="steps-title">Como funciona</div>
          <div class="step" v-for="(s, i) in steps" :key="i">
            <div class="step-num">{{ i + 1 }}</div>
            <div class="step-text">{{ s }}</div>
          </div>
        </div>
      </div>

      <!-- Painel direito — formulário -->
      <div class="panel-right">
        <div class="form-card">
          <div class="form-header">
            <div class="form-title">Criar conta gratuita</div>
            <div class="form-subtitle">Comece seus estudos bíblicos hoje</div>
          </div>

          <!-- Mensagem de erro -->
          <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
          <!-- Mensagem de sucesso -->
          <div v-if="successMsg" class="success-box">{{ successMsg }}</div>

          <div class="form-row">
            <div class="form-group">
              <label>Nome completo</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Seu nome"
                autocomplete="name"
                :disabled="loading"
                @keyup.enter="handleRegister"
              />
            </div>
          </div>

          <div class="form-group">
            <label>E-mail</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="seu@email.com"
              autocomplete="email"
              :disabled="loading"
              @keyup.enter="handleRegister"
            />
          </div>

          <div class="form-group">
            <label>Senha</label>
            <div class="input-wrapper">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mínimo 8 caracteres"
                :disabled="loading"
                @keyup.enter="handleRegister"
              />
              <button class="eye-btn" type="button" @click="showPassword = !showPassword" tabindex="-1">
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
            <!-- Barra de força da senha -->
            <div class="password-strength" v-if="form.password">
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :style="{ width: passwordStrength.pct + '%' }"
                  :class="passwordStrength.cls"
                ></div>
              </div>
              <span class="strength-label" :class="passwordStrength.cls">{{ passwordStrength.label }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Confirmar senha</label>
            <div class="input-wrapper">
              <input
                v-model="form.confirm"
                :type="showConfirm ? 'text' : 'password'"
                placeholder="Repita a senha"
                :disabled="loading"
                @keyup.enter="handleRegister"
                :class="{ 'input-error': form.confirm && form.password !== form.confirm }"
              />
              <button class="eye-btn" type="button" @click="showConfirm = !showConfirm" tabindex="-1">
                {{ showConfirm ? '🙈' : '👁' }}
              </button>
            </div>
            <span class="field-error" v-if="form.confirm && form.password !== form.confirm">
              As senhas não coincidem
            </span>
          </div>

          <div class="terms-row">
            <label class="terms-check">
              <input v-model="form.terms" type="checkbox" :disabled="loading" />
              <span>Concordo com os <a href="#" class="terms-link">Termos de Uso</a> e a <a href="#" class="terms-link">Política de Privacidade</a></span>
            </label>
          </div>

          <button
            class="btn-primary"
            :disabled="loading || !canSubmit"
            @click="handleRegister"
          >
            <span v-if="!loading">Criar minha conta</span>
            <span v-else class="loading-dots">Criando<span>.</span><span>.</span><span>.</span></span>
          </button>

          <div class="divider">ou cadastre-se com</div>

          <button class="btn-secondary" :disabled="loading" @click="handleGoogle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Cadastrar com Google
          </button>

          <div class="login-cta">
            Já tem conta?
            <RouterLink to="/login" class="login-link">Entrar no portal</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const auth   = useAuthStore()

const form = reactive({ name: '', email: '', password: '', confirm: '', terms: false })
const loading      = ref(false)
const showPassword = ref(false)
const showConfirm  = ref(false)
const errorMsg     = ref('')
const successMsg   = ref('')

const steps = [
  'Crie sua conta gratuita em segundos',
  'Escolha uma passagem bíblica para estudar',
  'Explore referências cruzadas automáticas',
  'Adicione notas e marcações no texto',
]

// Força da senha
const passwordStrength = computed(() => {
  const p = form.password
  if (!p) return { pct: 0, label: '', cls: '' }
  let score = 0
  if (p.length >= 8)  score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (score <= 1) return { pct: 25,  label: 'Fraca',  cls: 'weak' }
  if (score <= 2) return { pct: 50,  label: 'Média',  cls: 'medium' }
  if (score <= 3) return { pct: 75,  label: 'Boa',    cls: 'good' }
  return               { pct: 100, label: 'Forte',  cls: 'strong' }
})

const canSubmit = computed(() =>
  form.name.trim().length >= 2 &&
  form.email.includes('@') &&
  form.password.length >= 8 &&
  form.password === form.confirm &&
  form.terms
)

async function handleRegister() {
  errorMsg.value  = ''
  successMsg.value = ''
  if (!canSubmit.value) {
    if (!form.terms) { errorMsg.value = 'Aceite os termos para continuar.'; return }
    errorMsg.value = 'Preencha todos os campos corretamente.'
    return
  }
  loading.value = true
  try {
    await auth.register(form.name.trim(), form.email, form.password)
    router.push('/')
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Erro ao criar conta. Tente novamente.'
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

.register-page {
  min-height: 100vh;
  background: #F9F6F0;
  font-family: 'DM Sans', sans-serif;
  position: relative;
}

.bg {
  position: fixed; inset: 0; z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 80% 110%, rgba(138,158,140,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 10% -10%, rgba(184,150,90,0.08) 0%, transparent 55%),
    #F9F6F0;
}

.layout {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1fr 1fr;
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
  content: ''; position: absolute;
  bottom: -80px; right: -80px;
  width: 360px; height: 360px; border-radius: 50%;
  border: 1px solid rgba(138,158,140,0.15);
  animation: pulse 7s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50%       { transform: scale(1.04); opacity: 1; }
}

.brand { position: relative; z-index: 1; }
.brand-mark { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #B8965A, #D4B07A);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-size: 1rem; box-shadow: 0 4px 12px rgba(184,150,90,0.25);
}
.brand-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.6rem; font-weight: 600; letter-spacing: 0.05em; color: #1C1A17;
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
.verse-line { width: 32px; height: 2px; background: #8A9E8C; margin-bottom: 2rem; border-radius: 2px; }
.verse-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.2rem; line-height: 1.3;
  font-weight: 300; font-style: italic;
  color: #1C1A17; margin-bottom: 1.5rem; max-width: 400px;
}
.verse-text em { font-style: normal; color: #8A9E8C; }
.verse-ref { font-size: 0.78rem; letter-spacing: 0.15em; text-transform: uppercase; color: #9C9590; }

.steps { position: relative; z-index: 1; }
.steps-title {
  font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: #9C9590; margin-bottom: 1rem; font-weight: 500;
}
.step { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.65rem; }
.step-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(138,158,140,0.15); color: #8A9E8C;
  font-size: 0.7rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.step-text { font-size: 0.8rem; color: #4A4540; }

/* ── Painel direito ───────────────────────────────────── */
.panel-right {
  display: flex; align-items: center; justify-content: center;
  padding: 3rem; background: #FDFBF8;
}

.form-card {
  width: 100%; max-width: 400px;
  animation: fadeUp 0.7s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.form-header { margin-bottom: 2rem; }
.form-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem; font-weight: 600; color: #1C1A17; margin-bottom: 0.4rem;
}
.form-subtitle { font-size: 0.85rem; color: #9C9590; font-weight: 300; }

.error-box {
  background: rgba(196,122,122,0.12); border: 1px solid rgba(196,122,122,0.3);
  color: #8B3535; border-radius: 8px; padding: 0.75rem 1rem;
  font-size: 0.82rem; margin-bottom: 1.25rem; animation: fadeUp 0.3s ease;
}
.success-box {
  background: rgba(138,158,140,0.15); border: 1px solid rgba(138,158,140,0.3);
  color: #3A6B3C; border-radius: 8px; padding: 0.75rem 1rem;
  font-size: 0.82rem; margin-bottom: 1.25rem;
}

.form-group { margin-bottom: 1.1rem; }

label {
  display: block; font-size: 0.72rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4A4540; margin-bottom: 0.5rem; font-weight: 500;
}

.input-wrapper { position: relative; }
.eye-btn {
  position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
  background: none; border: none; font-size: 0.85rem; cursor: pointer;
  opacity: 0.5; transition: opacity 0.2s; padding: 0;
}
.eye-btn:hover { opacity: 1; }

input[type="text"],
input[type="email"],
input[type="password"] {
  width: 100%; padding: 0.85rem 1rem;
  background: #F9F6F0; border: 1px solid rgba(28,26,23,0.1);
  border-radius: 8px; font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem; color: #1C1A17; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
input:focus {
  border-color: #B8965A; background: #FDFBF8;
  box-shadow: 0 0 0 3px rgba(184,150,90,0.12);
}
input.input-error { border-color: rgba(196,122,122,0.6); }
input::placeholder { color: #9C9590; }
input:disabled { opacity: 0.6; cursor: not-allowed; }

.field-error { font-size: 0.72rem; color: #C47A7A; margin-top: 0.35rem; display: block; }

/* Força da senha */
.password-strength { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
.strength-bar { flex: 1; height: 4px; background: rgba(28,26,23,0.08); border-radius: 99px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 99px; transition: width 0.3s, background 0.3s; }
.strength-fill.weak   { background: #C47A7A; }
.strength-fill.medium { background: #D4A848; }
.strength-fill.good   { background: #8A9E8C; }
.strength-fill.strong { background: #4A8A4C; }
.strength-label { font-size: 0.68rem; font-weight: 500; white-space: nowrap; }
.strength-label.weak   { color: #C47A7A; }
.strength-label.medium { color: #D4A848; }
.strength-label.good   { color: #8A9E8C; }
.strength-label.strong { color: #4A8A4C; }

.terms-row { margin-bottom: 1.5rem; margin-top: 0.25rem; }
.terms-check {
  display: flex; align-items: flex-start; gap: 0.6rem;
  font-size: 0.78rem; color: #4A4540; cursor: pointer;
}
.terms-check input[type="checkbox"] {
  width: 15px; height: 15px; margin-top: 1px;
  accent-color: #B8965A; cursor: pointer; flex-shrink: 0;
}
.terms-link { color: #B8965A; text-decoration: none; }
.terms-link:hover { text-decoration: underline; }

.btn-primary {
  width: 100%; padding: 0.95rem;
  background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500;
  letter-spacing: 0.05em; cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
}
.btn-primary:hover:not(:disabled) {
  background: #B8965A;
  box-shadow: 0 6px 20px rgba(184,150,90,0.30);
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-dots span { animation: blink 1.2s infinite; opacity: 0; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

.divider {
  display: flex; align-items: center; gap: 1rem;
  margin: 1.5rem 0; color: #9C9590; font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px; background: rgba(28,26,23,0.1);
}

.btn-secondary {
  width: 100%; padding: 0.9rem; background: transparent; color: #4A4540;
  border: 1px solid rgba(28,26,23,0.1); border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 0.85rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.btn-secondary:hover:not(:disabled) {
  border-color: #B8965A; color: #1C1A17; background: rgba(184,150,90,0.04);
}

.login-cta { text-align: center; margin-top: 1.75rem; font-size: 0.82rem; color: #9C9590; }
.login-link { color: #B8965A; text-decoration: none; font-weight: 500; }
.login-link:hover { opacity: 0.7; }

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .panel-left { display: none; }
  .panel-right { background: #F9F6F0; padding: 2rem 1.5rem; }
}
</style>