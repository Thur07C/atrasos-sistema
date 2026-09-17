/* =========================================================
   MÓDULO DE GESTÃO DE ATRASOS ESCOLARES
   JavaScript Vanilla ES6+

   Namespace:
   window.GestaoAtrasos
========================================================= */

// Configuração e Conexão do Supabase
const SUPABASE_URL = 'https://rcgocynzxfvgitokhrau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZSk8fAmdH2EOAmFb6A8mXg_80Gmn1rQ';

// Inicializa o cliente do Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('Supabase configurado com sucesso!');

(function () {

    "use strict";

    /* =====================================================
       CONFIGURAÇÃO
    ====================================================== */

    const CONFIG = {

        STORAGE: {
            USERS: "ccm_atrasos_users_v1",
            TURMAS: "ccm_atrasos_turmas_v1",
            REGISTROS: "ccm_atrasos_registros_v1",
            SESSION: "ccm_atrasos_session_v1"
        },

        DEFAULT_ADMIN: {
            id: "USR-ADMIN-001",
            nome: "Administrador",
            username: "admin",
            password: "admin@2026",
            cargo: "administrador"
        }

    };

    /* =====================================================
       ESTADO
    ====================================================== */

    const state = {

        users: [],
        turmas: [],
        registros: [],
        currentUser: null,

        turmaRegistro: "",
        alunoSelecionado: null

    };

    /* =====================================================
       HELPERS DOM
    ====================================================== */

    const $ = (selector) => document.querySelector(selector);

    const $$ = (selector) => {
        return Array.from(document.querySelectorAll(selector));
    };

    function getElement(id) {
        return document.getElementById(id);
    }

    /* =====================================================
       STORAGE
    ====================================================== */

    function loadStorage() {

        state.users =
            JSON.parse(
                localStorage.getItem(CONFIG.STORAGE.USERS)
            ) || [];

        state.turmas =
            JSON.parse(
                localStorage.getItem(CONFIG.STORAGE.TURMAS)
            ) || [];

        state.registros =
            JSON.parse(
                localStorage.getItem(CONFIG.STORAGE.REGISTROS)
            ) || [];

    }

    function saveUsers() {

        localStorage.setItem(
            CONFIG.STORAGE.USERS,
            JSON.stringify(state.users)
        );

    }

    function saveTurmas() {

        localStorage.setItem(
            CONFIG.STORAGE.TURMAS,
            JSON.stringify(state.turmas)
        );

    }

    function saveRegistros() {

        localStorage.setItem(
            CONFIG.STORAGE.REGISTROS,
            JSON.stringify(state.registros)
        );

    }

    /* =====================================================
       USUÁRIO ADMINISTRADOR INICIAL
    ====================================================== */

    function initializeDefaultAdmin() {

        const adminExists = state.users.some(
            user => user.username === CONFIG.DEFAULT_ADMIN.username
        );

        if (!adminExists) {

            state.users.push({
                ...CONFIG.DEFAULT_ADMIN,
                criadoEm: new Date().toISOString()
            });

            saveUsers();
        }

    }

    /* =====================================================
       SESSION
    ====================================================== */

    function saveSession() {

        if (!state.currentUser) {

            localStorage.removeItem(
                CONFIG.STORAGE.SESSION
            );

            return;
        }

        localStorage.setItem(
            CONFIG.STORAGE.SESSION,
            JSON.stringify({
                userId: state.currentUser.id
            })
        );

    }

    function restoreSession() {

        const session = JSON.parse(
            localStorage.getItem(
                CONFIG.STORAGE.SESSION
            ) || "null"
        );

        if (!session) {
            return;
        }

        const user = state.users.find(
            item => item.id === session.userId
        );

        if (user) {
            state.currentUser = user;
        }

    }

    /* =====================================================
       LOGIN
    ====================================================== */

    function setCurrentUser(user) {

        state.currentUser = user;

        saveSession();

        updateCurrentUserUI();
        applyPermissions();
        refreshAll();

    }

    function logout() {

        state.currentUser = null;

        localStorage.removeItem(
            CONFIG.STORAGE.SESSION
        );

        updateCurrentUserUI();
        applyPermissions();

    }

    /* =====================================================
       ROLES / PERMISSÕES
    ====================================================== */

    const ROLE_LABELS = {

        monitor: "Monitor",
        pedagogico: "Pedagógico",
        direcao: "Direção",
        administrador: "Administrador"

    };

    const PERMISSIONS = {

        monitor: [
            "registrar"
        ],

        pedagogico: [
            "consultar",
            "exportar"
        ],

        direcao: [
            "registrar",
            "consultar",
            "exportar"
        ],

        administrador: [
            "registrar",
            "consultar",
            "exportar",
            "usuarios",
            "turmas",
            "configuracoes"
        ]

    };

    function hasPermission(permission) {

        if (!state.currentUser) {
            return false;
        }

        const permissions =
            PERMISSIONS[state.currentUser.cargo] || [];

        return permissions.includes(permission);

    }

    function applyPermissions() {

        $$("[data-role]").forEach(element => {

            const requiredRoles =
                element.dataset.role
                    .split(",")
                    .map(role => role.trim());

            const allowed =
                state.currentUser &&
                requiredRoles.includes(
                    state.currentUser.cargo
                );

            element.classList.toggle(
                "hidden",
                !allowed
            );

        });

        if (!state.currentUser) {

            getElement("atraso-module")
                ?.classList.add("hidden");

            return;
        }

        getElement("atraso-module")
            ?.classList.remove("hidden");

        updateTabAvailability();

    }

    function updateTabAvailability() {

        const tabPermission = {

            registrar: "registrar",
            consultar: "consultar",
            usuarios: "usuarios",
            turmas: "turmas",
            configuracoes: "configuracoes"

        };

        $$(".atraso-tab").forEach(tab => {

            const tabName =
                tab.dataset.atrasoTab;

            const permission =
                tabPermission[tabName];

            const allowed =
                hasPermission(permission);

            tab.classList.toggle(
                "hidden",
                !allowed
            );

        });

        $$(".atraso-panel").forEach(panel => {

            const panelName =
                panel.dataset.atrasoPanel;

            const permission =
                tabPermission[panelName];

            const allowed =
                hasPermission(permission);

            if (!allowed) {
                panel.classList.remove("active");
            }

        });

        const activeTab =
            $(".atraso-tab.active");

        if (
            !activeTab ||
            activeTab.classList.contains("hidden")
        ) {

            const firstVisible =
                $(".atraso-tab:not(.hidden)");

            if (firstVisible) {
                activateTab(
                    firstVisible.dataset.atrasoTab
                );
            }

        }

    }

    /* =====================================================
       UI DO USUÁRIO
    ====================================================== */

    function updateCurrentUserUI() {

        const nameElement =
            getElement("atraso-current-user-name");

        const roleElement =
            getElement("atraso-current-user-role");

        if (!state.currentUser) {

            if (nameElement) {
                nameElement.textContent = "Não autenticado";
            }

            if (roleElement) {
                roleElement.textContent = "";
            }

            return;
        }

        nameElement.textContent =
            state.currentUser.nome;

        roleElement.textContent =
            ROLE_LABELS[state.currentUser.cargo] ||
            state.currentUser.cargo;

    }

    /* =====================================================
       TABS
    ====================================================== */

    function activateTab(tabName) {

        $$(".atraso-tab").forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.atrasoTab === tabName
            );

        });

        $$(".atraso-panel").forEach(panel => {

            panel.classList.toggle(
                "active",
                panel.dataset.atrasoPanel === tabName
            );

        });

    }

    function setupTabs() {

        $$(".atraso-tab").forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    const tabName =
                        tab.dataset.atrasoTab;

                    activateTab(tabName);

                    refreshAll();

                }
            );

        });

    }

    /* =====================================================
       DATA / HORA
    ====================================================== */

    function pad(number) {
        return String(number).padStart(2, "0");
    }

    function getLocalDateTime() {

        const now = new Date();

        return {

            date:
                `${now.getFullYear()}-` +
                `${pad(now.getMonth() + 1)}-` +
                `${pad(now.getDate())}`,

            time:
                `${pad(now.getHours())}:` +
                `${pad(now.getMinutes())}`

        };

    }

    function initializeDateTime() {

        const dateTime =
            getLocalDateTime();

        const dateInput =
            getElement("atraso-data");

        const timeInput =
            getElement("atraso-hora");

        if (dateInput) {
            dateInput.value = dateTime.date;
        }

        if (timeInput) {
            timeInput.value = dateTime.time;
        }

    }

    /* =====================================================
       TURMAS
    ====================================================== */

    function generateId(prefix) {

        return (
            prefix +
            "-" +
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8)
        ).toUpperCase();

    }

    function sortStudents(students) {

        return students.sort(
            (a, b) =>
                a.nome.localeCompare(
                    b.nome,
                    "pt-BR",
                    { sensitivity: "base" }
                )
        );

    }

    function createTurma(event) {

        event.preventDefault();

        if (!hasPermission("turmas")) {

            showToast(
                "Apenas o Administrador pode criar turmas.",
                "error"
            );

            return;
        }

        const nomeInput =
            getElement("atraso-turma-nome");

        const alunosInput =
            getElement("atraso-alunos-lote");

        const nome =
            nomeInput.value.trim();

        const nomes =
            alunosInput.value
                .split("\n")
                .map(nome => nome.trim())
                .filter(Boolean);

        if (!nome) {

            showToast(
                "Informe o nome da turma.",
                "error"
            );

            return;
        }

        if (nomes.length === 0) {

            showToast(
                "Informe pelo menos um aluno.",
                "error"
            );

            return;
        }

        const turmaExiste =
            state.turmas.some(
                turma =>
                    turma.nome.toLowerCase() ===
                    nome.toLowerCase()
            );

        if (turmaExiste) {

            showToast(
                "Essa turma já está cadastrada.",
                "error"
            );

            return;
        }

        const alunos = sortStudents(
            nomes.map(nomeAluno => ({

                id: generateId("ALU"),
                nome: nomeAluno,
                numeroChamada: 0,
                situacao: "Matriculado",
                criadoEm: new Date().toISOString()

            }))
        );

        alunos.forEach(
            (aluno, index) => {
                aluno.numeroChamada = index + 1;
            }
        );

        state.turmas.push({

            id: generateId("TURMA"),
            nome,
            alunos,
            criadoEm: new Date().toISOString()

        });

        saveTurmas();

        event.target.reset();

        renderTurmasAdmin();
        populateTurmaSelects();

        showToast(
            `Turma ${nome} criada com ${alunos.length} alunos.`,
            "success"
        );

    }

    function renderTurmasAdmin() {

        const container =
            getElement("atraso-lista-turmas");

        if (!container) {
            return;
        }

        if (state.turmas.length === 0) {

            container.innerHTML =
                `<div class="atraso-empty">
                    Nenhuma turma cadastrada.
                </div>`;

            return;
        }

        container.innerHTML =
            state.turmas
                .sort((a, b) =>
                    a.nome.localeCompare(
                        b.nome,
                        "pt-BR"
                    )
                )
                .map(turma => {

                    return `
                    <div class="atraso-turma-item">
                        <div class="atraso-turma-header">
                            <div>
                                <strong>
                                    ${escapeHtml(turma.nome)}
                                </strong>
                                <small>
                                    ${turma.alunos.length} aluno(s)
                                </small>
                            </div>

                            <button
                                type="button"
                                class="atraso-btn atraso-btn-danger atraso-btn-small"
                                data-delete-turma="${turma.id}"
                            >
                                Excluir turma
                            </button>
                        </div>

                        ${
                            turma.alunos.map(aluno => `
                                <div class="atraso-aluno-admin-row">
                                    <span class="atraso-chamada">
                                        ${aluno.numeroChamada}
                                    </span>

                                    <span>
                                        ${escapeHtml(aluno.nome)}
                                    </span>

                                    <select
                                        data-aluno-status="${aluno.id}"
                                        data-turma-id="${turma.id}"
                                    >
                                        <option
                                            value="Matriculado"
                                            ${aluno.situacao === "Matriculado" ? "selected" : ""}
                                        >
                                            Matriculado
                                        </option>
                                        <option
                                            value="Remanejado"
                                            ${aluno.situacao === "Remanejado" ? "selected" : ""}
                                        >
                                            Remanejado
                                        </option>
                                        <option
                                            value="Transferido"
                                            ${aluno.situacao === "Transferido" ? "selected" : ""}
                                        >
                                            Transferido
                                        </option>
                                    </select>
                                </div>
                            `).join("")
                        }
                    </div>
                    `;

                })
                .join("");

    }

    function changeStudentStatus(turmaId, alunoId, status) {

        const turma = state.turmas.find(item => item.id === turmaId);
        if (!turma) return;

        const aluno = turma.alunos.find(item => item.id === alunoId);
        if (!aluno) return;

        aluno.situacao = status;

        saveTurmas();

        renderTurmasAdmin();
        populateTurmaSelects();
        renderRegistrationStudents();

        showToast(
            `${aluno.nome}: situação alterada para ${status}.`,
            "success"
        );

    }

    function deleteTurma(turmaId) {

        const turma = state.turmas.find(item => item.id === turmaId);
        if (!turma) return;

        const confirmed = window.confirm(
            `Excluir a turma "${turma.nome}"?\n\n` +
            `Os registros históricos de atraso NÃO serão apagados.`
        );

        if (!confirmed) return;

        state.turmas = state.turmas.filter(item => item.id !== turmaId);

        saveTurmas();

        renderTurmasAdmin();
        populateTurmaSelects();

        showToast("Turma excluída.", "success");

    }

    /* =====================================================
       SELECTS DE TURMAS
    ====================================================== */

    function populateTurmaSelects() {

        const selects = [
            getElement("atraso-turma-registro"),
            getElement("atraso-filtro-turma")
        ];

        selects.forEach(select => {

            if (!select) return;

            const previous = select.value;
            const isFilter = select.id === "atraso-filtro-turma";

            select.innerHTML = isFilter
                ? `<option value="">Todas as turmas</option>`
                : `<option value="">Selecione uma turma</option>`;

            const sorted = [...state.turmas].sort((a, b) =>
                a.nome.localeCompare(b.nome, "pt-BR")
            );

            sorted.forEach(turma => {

                const option = document.createElement("option");
                option.value = turma.id;
                option.textContent = turma.nome;
                select.appendChild(option);

            });

            if (previous && state.turmas.some(turma => turma.id === previous)) {
                select.value = previous;
            }

        });

    }

    /* =====================================================
       REGISTRO DE ATRASO
    ====================================================== */

    function setupRegistration() {

        const turmaSelect = getElement("atraso-turma-registro");
        const searchInput = getElement("atraso-busca-aluno");
        const form = getElement("atraso-form-registro");

        turmaSelect?.addEventListener("change", () => {
            state.turmaRegistro = turmaSelect.value;
            state.alunoSelecionado = null;
            clearSelectedStudent();
            renderRegistrationStudents();
        });

        searchInput?.addEventListener("input", () => {
            renderRegistrationStudents();
        });

        form?.addEventListener("submit", registerDelay);

        getElement("atraso-remover-aluno")?.addEventListener("click", () => {
            state.alunoSelecionado = null;
            clearSelectedStudent();
            renderRegistrationStudents();
        });

        getElement("atraso-btn-limpar")?.addEventListener("click", () => {
            setTimeout(() => {
                state.alunoSelecionado = null;
                clearSelectedStudent();
                initializeDateTime();
                renderRegistrationStudents();
            }, 0);
        });

    }

    function getSelectedRegistrationTurma() {

        return state.turmas.find(
            turma => turma.id === state.turmaRegistro
        );

    }

    function getStudentDelayCount(alunoId) {

        return state.registros.filter(
            registro => registro.alunoId === alunoId
        ).length;

    }

    function renderRegistrationStudents() {

        const container = getElement("atraso-lista-alunos-registro");
        if (!container) return;

        const turma = getSelectedRegistrationTurma();

        if (!turma) {
            container.innerHTML = `<div class="atraso-empty">Selecione uma turma para visualizar os alunos.</div>`;
            return;
        }

        const search = (getElement("atraso-busca-aluno")?.value || "").trim().toLowerCase();

        const students = turma.alunos
            .filter(aluno => aluno.situacao === "Matriculado")
            .filter(aluno => {
                if (!search) return true;
                return aluno.nome.toLowerCase().includes(search) || String(aluno.numeroChamada) === search;
            })
            .sort((a, b) => a.numeroChamada - b.numeroChamada);

        if (students.length === 0) {
            container.innerHTML = `<div class="atraso-empty">Nenhum aluno matriculado encontrado.</div>`;
            return;
        }

        container.innerHTML = students.map(aluno => {

            const count = getStudentDelayCount(aluno.id);
            const alerta = count > 3 ? "alerta" : "";

            return `
                <button
                    type="button"
                    class="atraso-student-option ${alerta}"
                    data-select-student="${aluno.id}"
                >
                    <span>
                        <strong>${aluno.numeroChamada}. ${escapeHtml(aluno.nome)}</strong>
                        <small>Matriculado</small>
                    </span>
                    <span class="atraso-student-count">${count} atraso(s)</span>
                </button>
            `;

        }).join("");

    }

    function selectStudent(alunoId) {

        const turma = getSelectedRegistrationTurma();
        if (!turma) return;

        const aluno = turma.alunos.find(
            item => item.id === alunoId && item.situacao === "Matriculado"
        );
        if (!aluno) return;

        state.alunoSelecionado = {
            alunoId: aluno.id,
            turmaId: turma.id
        };

        getElement("atraso-aluno-selecionado").value = aluno.id;
        getElement("atraso-aluno-selecionado-nome").textContent = aluno.nome;
        getElement("atraso-aluno-selecionado-numero").textContent = aluno.numeroChamada;
        getElement("atraso-aluno-selecionado-card").classList.remove("hidden");
        getElement("atraso-lista-alunos-registro").classList.add("hidden");
        getElement("atraso-busca-aluno").value = "";

    }

    function clearSelectedStudent() {
        getElement("atraso-aluno-selecionado").value = "";
        getElement("atraso-aluno-selecionado-card").classList.add("hidden");
    }

    /* =====================================================
       GERAÇÃO DE ID DE 5 DÍGITOS
    ====================================================== */

    function generateDelayId() {

        const used = new Set(state.registros.map(registro => registro.id));

        for (let number = 1; number <= 99999; number++) {
            const id = String(number).padStart(5, "0");
            if (!used.has(id)) return id;
        }

        throw new Error("Limite de 99.999 registros atingido.");

    }

    /* =====================================================
       SALVAR ATRASO
    ====================================================== */

    function registerDelay(event) {

        event.preventDefault();

        if (!hasPermission("registrar")) {
            showToast("Seu cargo não possui permissão para registrar atrasos.", "error");
            return;
        }

        if (!state.currentUser) {
            showToast("Nenhum usuário autenticado.", "error");
            return;
        }

        if (!state.alunoSelecionado) {
            showToast("Selecione um aluno.", "error");
            return;
        }

        const turma = state.turmas.find(item => item.id === state.alunoSelecionado.turmaId);
        if (!turma) {
            showToast("Turma não encontrada.", "error");
            return;
        }

        const aluno = turma.alunos.find(item => item.id === state.alunoSelecionado.alunoId);
        if (!aluno || aluno.situacao !== "Matriculado") {
            showToast("Somente alunos matriculados podem receber registros.", "error");
            return;
        }

        const data = getElement("atraso-data").value;
        const hora = getElement("atraso-hora").value;
        const justificado = getElement("atraso-justificado").checked;

        if (!data || !hora) {
            showToast("Informe data e hora.", "error");
            return;
        }

        const id = generateDelayId();

        const registro = {
            id,
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            turmaId: turma.id,
            turmaNome: turma.nome,
            numeroChamada: aluno.numeroChamada,
            data,
            hora,
            justificado,
            status: justificado ? "Justificado" : "Não justificado",
            usuarioId: state.currentUser.id,
            usuarioNome: state.currentUser.nome,
            criadoEm: new Date().toISOString()
        };

        state.registros.push(registro);
        saveRegistros();

        showToast(`Atraso registrado com sucesso. ID: ${id}`, "success");

        resetRegistrationForm();
        refreshAll();

    }

    function resetRegistrationForm() {

        getElement("atraso-form-registro")?.reset();
        state.turmaRegistro = "";
        state.alunoSelecionado = null;
        clearSelectedStudent();
        initializeDateTime();
        renderRegistrationStudents();

    }

    /* =====================================================
       CONSULTAS E RELATÓRIOS
    ====================================================== */

    function setupConsultas() {

        getElement("atraso-filtro-turma")?.addEventListener("change", () => renderConsultas());
        getElement("atraso-filtro-aluno")?.addEventListener("input", () => renderConsultas());
        getElement("atraso-btn-buscar-id")?.addEventListener("click", searchById);
        getElement("atraso-exportar")?.addEventListener("click", exportToCSV);

    }

    function searchById() {

        const input = getElement("atraso-busca-id");
        const id = input?.value.trim().padStart(5, "0");

        if (!id) {
            showToast("Informe o ID do registro.", "error");
            return;
        }

        const registro = state.registros.find(item => item.id === id);

        if (!registro) {
            showToast(`Registro #${id} não encontrado.`, "error");
            return;
        }

        renderConsultas([registro]);

    }

    function renderConsultas(registrosFiltrados = null) {

        const tbody = getElement("atraso-tbody-consultas");
        const emptyMsg = getElement("atraso-consulta-vazia");
        if (!tbody) return;

        let dados = registrosFiltrados || state.registros;

        if (!registrosFiltrados) {
            const turmaId = getElement("atraso-filtro-turma")?.value || "";
            const alunoBusca = (getElement("atraso-filtro-aluno")?.value || "").trim().toLowerCase();

            dados = dados.filter(item => {
                const matchTurma = !turmaId || item.turmaId === turmaId;
                const matchAluno = !alunoBusca || item.alunoNome.toLowerCase().includes(alunoBusca);
                return matchTurma && matchAluno;
            });
        }

        // Atualizar Indicadores/Estatísticas
        const totalRegistros = dados.length;
        const alunosUnicos = new Set(dados.map(item => item.alunoId)).size;
        
        // Contagem de alertas (mais de 3 atrasos)
        const contagemPorAluno = {};
        state.registros.forEach(item => {
            contagemPorAluno[item.alunoId] = (contagemPorAluno[item.alunoId] || 0) + 1;
        });
        const alertas = Object.values(contagemPorAluno).filter(c => c > 3).length;

        if (getElement("atraso-stat-total")) getElement("atraso-stat-total").textContent = totalRegistros;
        if (getElement("atraso-stat-alunos")) getElement("atraso-stat-alunos").textContent = alunosUnicos;
        if (getElement("atraso-stat-alertas")) getElement("atraso-stat-alertas").textContent = alertas;

        if (dados.length === 0) {
            tbody.innerHTML = "";
            emptyMsg?.classList.remove("hidden");
            return;
        }

        emptyMsg?.classList.add("hidden");
        const canDelete = hasPermission("administrador");

        tbody.innerHTML = dados
            .slice()
            .reverse()
            .map(item => `
                <tr>
                    <td><strong>#${item.id}</strong></td>
                    <td>${formatDate(item.data)}</td>
                    <td>${item.hora}</td>
                    <td>${escapeHtml(item.alunoNome)}</td>
                    <td>${escapeHtml(item.turmaNome)}</td>
                    <td>${item.numeroChamada}</td>
                    <td>
                        <span class="atraso-badge ${item.justificado ? 'justificado' : 'pendente'}">
                            ${item.status}
                        </span>
                    </td>
                    <td>${escapeHtml(item.usuarioNome)}</td>
                    <td>
                        ${canDelete ? `
                            <button
                                type="button"
                                class="atraso-btn atraso-btn-danger atraso-btn-small"
                                data-delete-registro="${item.id}"
                            >
                                Excluir
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `).join("");

    }

    function deleteRegistro(id) {

        if (!hasPermission("administrador")) {
            showToast("Apenas o Administrador pode excluir registros.", "error");
            return;
        }

        if (!window.confirm(`Tem certeza que deseja excluir o registro #${id}?`)) {
            return;
        }

        state.registros = state.registros.filter(item => item.id !== id);
        saveRegistros();
        renderConsultas();
        renderRegistrationStudents();
        showToast(`Registro #${id} excluído com sucesso.`, "success");

    }

    /* =====================================================
       EXPORTAÇÃO DE DADOS (CSV)
    ====================================================== */

    function exportToCSV() {

        if (!hasPermission("exportar")) {
            showToast("Você não possui permissão para exportar relatórios.", "error");
            return;
        }

        if (state.registros.length === 0) {
            showToast("Não há registros para exportar.", "error");
            return;
        }

        const headers = ["ID", "Data", "Hora", "Aluno", "Turma", "Nº Chamada", "Status", "Registrado Por"];
        const rows = state.registros.map(r => [
            r.id,
            r.data,
            r.hora,
            `"${r.alunoNome.replace(/"/g, '""')}"`,
            `"${r.turmaNome.replace(/"/g, '""')}"`,
            r.numeroChamada,
            r.status,
            `"${r.usuarioNome.replace(/"/g, '""')}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_atrasos_${getLocalDateTime().date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    }

    /* =====================================================
       UTILITÁRIOS E UI
    ====================================================== */

    function formatDate(dateString) {
        if (!dateString) return "";
        const parts = dateString.split("-");
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showToast(message, type = "info") {

        const container = getElement("atraso-toast");
        if (!container) return;

        container.textContent = message;
        container.className = `atraso-toast atraso-toast-${type} active`;

        setTimeout(() => {
            container.classList.remove("active");
        }, 3000);

    }

    /* =====================================================
       DELEGATION DE EVENTOS E REFRESH
    ====================================================== */

    function setupGlobalEvents() {

        document.addEventListener("click", (event) => {

            const target = event.target;

            // Selecionar aluno para registro
            const selectBtn = target.closest("[data-select-student]");
            if (selectBtn) {
                selectStudent(selectBtn.dataset.selectStudent);
                return;
            }

            // Deletar Turma
            const deleteTurmaBtn = target.closest("[data-delete-turma]");
            if (deleteTurmaBtn) {
                deleteTurma(deleteTurmaBtn.dataset.deleteTurma);
                return;
            }

            // Deletar Registro
            const deleteRegistroBtn = target.closest("[data-delete-registro]");
            if (deleteRegistroBtn) {
                deleteRegistro(deleteRegistroBtn.dataset.deleteRegistro);
                return;
            }

        });

        document.addEventListener("change", (event) => {

            const target = event.target;

            // Mudar Situação do Aluno na Admin
            if (target.dataset.alunoStatus) {
                changeStudentStatus(
                    target.dataset.turmaId,
                    target.dataset.alunoStatus,
                    target.value
                );
            }

        });

        // Form de Criar Turma
        getElement("atraso-form-turma")?.addEventListener("submit", createTurma);

    }

    function refreshAll() {

        populateTurmaSelects();
        renderRegistrationStudents();
        renderConsultas();
        renderTurmasAdmin();

    }

    /* =====================================================
       INICIALIZAÇÃO DO MÓDULO
    ====================================================== */

    function init() {

        loadStorage();
        initializeDefaultAdmin();
        restoreSession();

        // Expõe funções públicas no Namespace
        window.GestaoAtrasos = {
            setCurrentUser,
            logout,
            getState: () => ({ ...state }),
            refresh: refreshAll
        };

        // Configurações da Interface
        updateCurrentUserUI();
        applyPermissions();
        setupTabs();
        setupRegistration();
        setupConsultas();
        setupGlobalEvents();
        initializeDateTime();
        refreshAll();

    }

    // Aguarda o carregamento do DOM para rodar
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
