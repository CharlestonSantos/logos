<template>
  <div class="profile-page">

    <header class="profile-header">
      <div class="profile-avatar">
        <span class="avatar-initials">{{ initials }}</span>
      </div>
      <div class="profile-info">
        <div class="profile-name">{{ auth.user?.name || 'Usuário' }}</div>
        <div class="profile-email">{{ auth.user?.email }}</div>
        <div class="profile-since">Membro desde {{ memberSince }}</div>
      </div>
    </header>

    <div class="profile-body">

      <!-- Coluna principal -->
      <div class="profile-main">

        <!-- Dados pessoais -->
        <div class="card">
          <div class="card-title">Dados pessoais</div>

          <div class="form-group">
            <label>Nome completo</label>
            <input v-model="form.name" type="text" :disabled="!editing" />
          </div>

          <div class="form-group">
            <label>E-mail</label>
            <input v-model="form.email" type="email" :disabled="!editing" />
          </div>

          <div class="form-actions" v-if="!editing">
            <button class="btn-outline" @click="editing = true">Editar dados</button>
          </div>
          <div class="form-actions" v-else>
            <button class="btn-primary" @click="saveProfile" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
            <button class="btn-outline" @click="cancelEdit">Cancelar</button>
          </div>

          <div class="success-msg" v-if="savedMsg">✓ {{ savedMsg }}</div>
        </div>

        <!-- Alterar senha -->
        <div class="card">
          <div class="card-title">Alterar senha</div>

          <div class="form-group">
            <label>Senha atual</label>
            <input v-model="pwd.current" type="password" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label>Nova senha</label>
            <input v-model="pwd.new" type="password" placeholder="Mínimo 8 caracteres" />
          </div>
          <div class="form-group">
            <label>Confirmar nova senha</label>
            <input v-model="pwd.confirm" type="password" placeholder="Repita a nova senha" />
          </div>

          <div class="error-msg" v-if="pwdError">{{ pwdError }}</div>
          <div class="success-msg" v-if="pwdSuccess">✓ {{ pwdSuccess }}</div>

          <div class="form-actions">
            <button class="btn-primary" @click="changePassword" :disabled="savingPwd">
              {{ savingPwd ? 'Salvando...' : 'Alterar senha' }}
            </button>
          </div>
        </div>

      </div>

      <!-- Coluna lateral -->
      <aside class="profile-side">

        <!-- Estatísticas -->
        <div class="card stats-card">
          <div class="card-title">Sua jornada</div>
          <div class="stat-row" v-for="s in stats" :key="s.label">
            <div class="stat-row-icon">{{ s.icon }}</div>
            <div class="stat-row-info">
              <div class="stat-row-label">{{ s.label }}</div>
              <div class="stat-row-value">{{ s.value }}</div>
            </div>
          </div>
        </div>

        <!-- Preferências -->
        <div class="card">
          <div class="card-title">Preferências</div>

          <div class="pref-row">
            <div class="pref-info">
              <div class="pref-label">Versão padrão</div>
              <div class="pref-sub">Versão exibida na leitura</div>
            </div>
            <select v-model="prefs.version" class="pref-select">
              <option value="NVI">NVI</option>
              <option value="ARA">Almeida</option>
            </select>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <div class="pref-label">Tamanho da fonte</div>
              <div class="pref-sub">Tamanho padrão na leitura</div>
            </div>
            <select v-model="prefs.fontSize" class="pref-select">
              <option value="16">Pequeno</option>
              <option value="18">Médio</option>
              <option value="22">Grande</option>
            </select>
          </div>

          <button class="btn-outline full" @click="savePrefs">Salvar preferências</button>
        </div>

        <!-- Zona de perigo -->
        <div class="card danger-card">
          <div class="card-title danger-title">Sair da conta</div>
          <p class="danger-text">Encerra sua sessão atual no Logos.</p>
          <button class="btn-danger" @click="handleLogout">
            Sair da conta
          </button>
        </div>

      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const auth   = useAuthStore()
const router = useRouter()

// ── Formulário de dados ──────────────────────────────────────
const editing  = ref(false)
const saving   = ref(false)
const savedMsg = ref('')

const form = reactive({
  name:  auth.user?.name  || '',
  email: auth.user?.email || '',
})

function cancelEdit() {
  form.name  = auth.user?.name  || ''
  form.email = auth.user?.email || ''
  editing.value = false
}

async function saveProfile() {
  saving.value = true
  try {
    // Futuramente: await api.put('/users/me', form)
    auth.user.name  = form.name
    auth.user.email = form.email
    savedMsg.value  = 'Dados atualizados com sucesso!'
    editing.value   = false
    setTimeout(() => savedMsg.value = '', 3000)
  } finally {
    saving.value = false
  }
}

// ── Senha ────────────────────────────────────────────────────
const pwd        = reactive({ current: '', new: '', confirm: '' })
const pwdError   = ref('')
const pwdSuccess = ref('')
const savingPwd  = ref(false)

async function changePassword() {
  pwdError.value   = ''
  pwdSuccess.value = ''
  if (!pwd.current || !pwd.new || !pwd.confirm) {
    pwdError.value = 'Preencha todos os campos.'
    return
  }
  if (pwd.new.length < 8) {
    pwdError.value = 'A nova senha deve ter ao menos 8 caracteres.'
    return
  }
  if (pwd.new !== pwd.confirm) {
    pwdError.value = 'As senhas não coincidem.'
    return
  }
  savingPwd.value = true
  try {
    // Futuramente: await api.put('/users/me/password', { current: pwd.current, new: pwd.new })
    pwdSuccess.value = 'Senha alterada com sucesso!'
    pwd.current = pwd.new = pwd.confirm = ''
    setTimeout(() => pwdSuccess.value = '', 3000)
  } finally {
    savingPwd.value = false
  }
}

// ── Logout ───────────────────────────────────────────────────
async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

// ── Preferências ─────────────────────────────────────────────
const prefs = reactive({ version: 'NVI', fontSize: '18' })

function savePrefs() {
  localStorage.setItem('logos:prefs', JSON.stringify(prefs))
}

onMounted(() => {
  const saved = localStorage.getItem('logos:prefs')
  if (saved) Object.assign(prefs, JSON.parse(saved))
})

// ── Computed ─────────────────────────────────────────────────
const initials = computed(() => {
  const n = auth.user?.name || ''
  return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
})

const memberSince = computed(() => {
  const d = auth.user?.createdAt ? new Date(auth.user.createdAt) : new Date()
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const stats = [
  { icon: '📖', label: 'Capítulos lidos',  value: '0'  },
  { icon: '📝', label: 'Notas criadas',    value: '0'  },
  { icon: '🔆', label: 'Versículos marcados', value: '0' },
  { icon: '🔥', label: 'Dias de sequência', value: '1d' },
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

.profile-page {
  height: 100vh; overflow-y: auto;
  background: #F9F6F0;
  font-family: 'DM Sans', sans-serif;
  color: #1C1A17;
}

/* ── Header ─────────────────────────────────────────────── */
.profile-header {
  display: flex; align-items: center; gap: 1.5rem;
  padding: 2.5rem;
  background: #FDFBF8;
  border-bottom: 1px solid rgba(28,26,23,0.08);
}

.profile-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, #B8965A, #D4B07A);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.avatar-initials {
  font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 600;
  color: white;
}
.profile-name {
  font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 600;
  color: #1C1A17;
}
.profile-email { font-size: 0.85rem; color: #9C9590; margin-top: 0.2rem; }
.profile-since { font-size: 0.75rem; color: #B8965A; margin-top: 0.25rem; }

/* ── Body ───────────────────────────────────────────────── */
.profile-body {
  display: grid; grid-template-columns: 1fr 320px;
  gap: 1.5rem; padding: 2rem 2.5rem;
  max-width: 1100px;
}

.profile-main { display: flex; flex-direction: column; gap: 1.5rem; }
.profile-side  { display: flex; flex-direction: column; gap: 1.25rem; }

/* ── Cards ──────────────────────────────────────────────── */
.card {
  background: #FDFBF8;
  border: 1px solid rgba(28,26,23,0.08);
  border-radius: 16px; padding: 1.75rem;
}
.card-title {
  font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: #9C9590; margin-bottom: 1.25rem;
}

/* ── Formulário ─────────────────────────────────────────── */
.form-group { margin-bottom: 1rem; }
label {
  display: block; font-size: 0.72rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: #4A4540;
  margin-bottom: 0.4rem; font-weight: 500;
}
input[type="text"],
input[type="email"],
input[type="password"] {
  width: 100%; padding: 0.8rem 1rem;
  background: #F9F6F0; border: 1px solid rgba(28,26,23,0.1);
  border-radius: 8px; font-family: 'DM Sans', sans-serif;
  font-size: 0.88rem; color: #1C1A17; outline: none;
  transition: border-color 0.2s, background 0.2s;
}
input:focus { border-color: #B8965A; background: #FDFBF8; box-shadow: 0 0 0 3px rgba(184,150,90,0.1); }
input:disabled { opacity: 0.6; cursor: not-allowed; background: rgba(28,26,23,0.04); }

.form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }

.btn-primary {
  padding: 0.7rem 1.5rem;
  background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #B8965A; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline {
  padding: 0.7rem 1.5rem;
  background: transparent; color: #4A4540;
  border: 1px solid rgba(28,26,23,0.15);
  border-radius: 8px; font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
}
.btn-outline:hover { border-color: #B8965A; color: #B8965A; }
.btn-outline.full { width: 100%; margin-top: 1rem; text-align: center; }

.error-msg   { font-size: 0.8rem; color: #C47A7A; margin-top: 0.75rem; }
.success-msg { font-size: 0.8rem; color: #4A8A4C; margin-top: 0.75rem; }

/* ── Stats ──────────────────────────────────────────────── */
.stat-row {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.6rem 0; border-bottom: 1px solid rgba(28,26,23,0.06);
}
.stat-row:last-child { border-bottom: none; }
.stat-row-icon { font-size: 1rem; width: 24px; text-align: center; }
.stat-row-label { font-size: 0.8rem; color: #4A4540; }
.stat-row-value { font-size: 0.75rem; color: #B8965A; font-weight: 600; margin-top: 0.1rem; }

/* ── Preferências ───────────────────────────────────────── */
.pref-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 0; border-bottom: 1px solid rgba(28,26,23,0.06);
}
.pref-row:last-of-type { border-bottom: none; }
.pref-label { font-size: 0.82rem; color: #1C1A17; font-weight: 500; }
.pref-sub   { font-size: 0.72rem; color: #9C9590; margin-top: 0.15rem; }
.pref-select {
  padding: 0.35rem 0.6rem;
  border: 1px solid rgba(28,26,23,0.12);
  border-radius: 6px; background: #F9F6F0;
  font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
  color: #1C1A17; cursor: pointer; outline: none;
}

/* ── Danger zone ────────────────────────────────────────── */
.danger-card { border-color: rgba(196,122,122,0.2); }
.danger-title { color: #C47A7A !important; }
.danger-text  { font-size: 0.82rem; color: #9C9590; margin-bottom: 1.25rem; line-height: 1.5; }

.btn-danger {
  width: 100%; padding: 0.75rem;
  background: transparent; color: #C47A7A;
  border: 1px solid rgba(196,122,122,0.35);
  border-radius: 8px; font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem; font-weight: 500; cursor: pointer;
  transition: all 0.2s;
}
.btn-danger:hover {
  background: rgba(196,122,122,0.08);
  border-color: #C47A7A;
}

/* ── Responsivo ─────────────────────────────────────────── */
@media (max-width: 900px) {
  .profile-body { grid-template-columns: 1fr; padding: 1.5rem; }
  .profile-header { padding: 1.5rem; }
}
</style>