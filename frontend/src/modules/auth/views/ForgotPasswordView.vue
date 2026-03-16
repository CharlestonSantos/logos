<template>
  <div class="auth-page">
    <div class="auth-card">

      <div class="auth-logo">✦</div>
      <h1 class="auth-title">Esqueceu a senha?</h1>
      <p class="auth-desc">
        Digite seu email e enviaremos um link para redefinir sua senha.
      </p>

      <!-- Sucesso -->
      <div class="success-box" v-if="sent">
        <div class="success-icon">📬</div>
        <div class="success-title">Email enviado!</div>
        <div class="success-text">
          Se este email estiver cadastrado, você receberá as instruções em breve.
          Verifique sua caixa de entrada e a pasta de spam.
        </div>
        <RouterLink to="/login" class="btn-back">← Voltar ao login</RouterLink>
      </div>

      <!-- Formulário -->
      <form v-else @submit.prevent="submit" class="auth-form">
        <div class="field">
          <label class="field-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            :class="{ error: errors.email }"
            placeholder="seu@email.com"
            autocomplete="email"
            required
          />
          <span class="field-error" v-if="errors.email">{{ errors.email }}</span>
        </div>

        <div class="server-error" v-if="serverError">{{ serverError }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? 'Enviando...' : 'Enviar link de recuperação' }}
        </button>

        <RouterLink to="/login" class="auth-link">← Voltar ao login</RouterLink>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { api } from '@/shared/utils/api'

const email       = ref('')
const loading     = ref(false)
const sent        = ref(false)
const serverError = ref('')
const errors      = reactive({ email: '' })

async function submit() {
  errors.email  = ''
  serverError.value = ''

  if (!email.value) { errors.email = 'Email obrigatório'; return }

  loading.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    sent.value = true
  } catch (e) {
    serverError.value = e.response?.data?.message || 'Erro ao enviar email. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

.auth-page {
  min-height: 100vh; background: #F9F6F0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; padding: 1rem;
}
.auth-card {
  background: #FDFBF8; border: 1px solid rgba(28,26,23,0.08);
  border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 420px;
  box-shadow: 0 4px 24px rgba(28,26,23,0.06);
}
.auth-logo {
  text-align: center; font-size: 2rem; color: #B8965A; margin-bottom: 1.25rem;
}
.auth-title {
  font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 600;
  color: #1C1A17; text-align: center; margin-bottom: 0.5rem;
}
.auth-desc {
  text-align: center; color: #4A4540; font-size: 0.88rem;
  line-height: 1.6; margin-bottom: 2rem;
}
.auth-form { display: flex; flex-direction: column; gap: 1.25rem; }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field-label { font-size: 0.78rem; font-weight: 600; color: #1C1A17; }
.field-input {
  padding: 0.75rem 1rem; border: 1px solid rgba(28,26,23,0.15);
  border-radius: 8px; background: #F9F6F0; font-family: 'DM Sans', sans-serif;
  font-size: 0.95rem; color: #1C1A17; outline: none; transition: border-color 0.2s;
}
.field-input:focus { border-color: #B8965A; }
.field-input.error { border-color: #E05555; }
.field-error { font-size: 0.72rem; color: #E05555; }

.server-error {
  padding: 0.75rem 1rem; background: rgba(224,85,85,0.08);
  border: 1px solid rgba(224,85,85,0.2); border-radius: 8px;
  font-size: 0.82rem; color: #E05555; text-align: center;
}

.btn-submit {
  padding: 0.85rem; background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 8px; font-size: 0.95rem;
  font-family: 'DM Sans', sans-serif; font-weight: 500;
  cursor: pointer; transition: background 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.btn-submit:hover:not(:disabled) { background: #B8965A; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-link {
  text-align: center; font-size: 0.82rem; color: #9C9590;
  text-decoration: none; transition: color 0.2s;
}
.auth-link:hover { color: #B8965A; }

/* Sucesso */
.success-box { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.success-icon  { font-size: 3rem; }
.success-title { font-family: 'Lora', serif; font-size: 1.3rem; color: #1C1A17; }
.success-text  { font-size: 0.85rem; color: #4A4540; line-height: 1.7; }
.btn-back {
  margin-top: 0.5rem; font-size: 0.82rem; color: #9C9590;
  text-decoration: none; transition: color 0.2s;
}
.btn-back:hover { color: #B8965A; }
</style>
