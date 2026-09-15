/* =========================================================
   MÓDULO DE GESTÃO DE ATRASOS ESCOLARES
   JavaScript Vanilla ES6+

   Namespace:
   window.GestaoAtrasos
========================================================= */

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
       
       IMPORTANTE:
       Se seu sistema principal já possui autenticação,
       substitua esta parte por uma chamada para o usuário
       atualmente autenticado.
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

        /*
         * Caso o usuário não possa acessar a aba que
         * estava aberta, abre automaticamente a primeira
         * disponível.
         */

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

                criadoEm:
                    new Date().toISOString()

            }))
        );


        alunos.forEach(
            (aluno, index) => {

                aluno.numeroChamada =
                    index + 1;

            }
        );


        state.turmas.push({

            id: generateId("TURMA"),

            nome,

            alunos,

            criadoEm:
                new Date().toISOString()

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

                                <div
                                    class="atraso-aluno-admin-row"
                                >

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


    function changeStudentStatus(
        turmaId,
        alunoId,
        status
    ) {

        const turma =
            state.turmas.find(
                item => item.id === turmaId
            );

        if (!turma) {
            return;
        }

        const aluno =
            turma.alunos.find(
                item => item.id === alunoId
            );

        if (!aluno) {
            return;
        }

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

        const turma =
            state.turmas.find(
                item => item.id === turmaId
            );

        if (!turma) {
            return;
        }

        const confirmed =
            window.confirm(
                `Excluir a turma "${turma.nome}"?\n\n` +
                `Os registros históricos de atraso NÃO serão apagados.`
            );

        if (!confirmed) {
            return;
        }

        state.turmas =
            state.turmas.filter(
                item => item.id !== turmaId
            );

        saveTurmas();

        renderTurmasAdmin();
        populateTurmaSelects();

        showToast(
            "Turma excluída.",
            "success"
        );

    }


    /* =====================================================
       SELECTS DE TURMAS
    ====================================================== */

    function populateTurmaSelects() {

        const selects = [

            getElement(
                "atraso-turma-registro"
            ),

            getElement(
                "atraso-filtro-turma"
            )

        ];


        selects.forEach(select => {

            if (!select) {
                return;
            }

            const previous =
                select.value;

            const isFilter =
                select.id ===
                "atraso-filtro-turma";


            select.innerHTML =
                isFilter
                    ? `<option value="">
                            Todas as turmas
                       </option>`
                    : `<option value="">
                            Selecione uma turma
                       </option>`;


            const sorted =
                [...state.turmas]
                    .sort((a, b) =>
                        a.nome.localeCompare(
                            b.nome,
                            "pt-BR"
                        )
                    );


            sorted.forEach(turma => {

                const option =
                    document.createElement("option");

                option.value =
                    turma.id;

                option.textContent =
                    turma.nome;

                select.appendChild(option);

            });


            if (
                previous &&
                state.turmas.some(
                    turma => turma.id === previous
                )
            ) {

                select.value = previous;

            }

        });

    }


    /* =====================================================
       REGISTRO DE ATRASO
    ====================================================== */

    function setupRegistration() {

        const turmaSelect =
            getElement("atraso-turma-registro");

        const searchInput =
            getElement("atraso-busca-aluno");

        const form =
            getElement("atraso-form-registro");

        turmaSelect?.addEventListener(
            "change",
            () => {

                state.turmaRegistro =
                    turmaSelect.value;

                state.alunoSelecionado =
                    null;

                clearSelectedStudent();

                renderRegistrationStudents();

            }
        );


        searchInput?.addEventListener(
            "input",
            () => {

                renderRegistrationStudents();

            }
        );


        form?.addEventListener(
            "submit",
            registerDelay
        );


        getElement(
            "atraso-remover-aluno"
        )?.addEventListener(
            "click",
            () => {

                state.alunoSelecionado = null;

                clearSelectedStudent();

                renderRegistrationStudents();

            }
        );


        getElement(
            "atraso-btn-limpar"
        )?.addEventListener(
            "click",
            () => {

                setTimeout(() => {

                    state.alunoSelecionado = null;

                    clearSelectedStudent();

                    initializeDateTime();

                    renderRegistrationStudents();

                }, 0);

            }
        );

    }


    function getSelectedRegistrationTurma() {

        return state.turmas.find(
            turma =>
                turma.id === state.turmaRegistro
        );

    }


    function getStudentDelayCount(alunoId) {

        return state.registros.filter(
            registro =>
                registro.alunoId === alunoId
        ).length;

    }


    function renderRegistrationStudents() {

        const container =
            getElement(
                "atraso-lista-alunos-registro"
            );

        if (!container) {
            return;
        }

        const turma =
            getSelectedRegistrationTurma();


        if (!turma) {

            container.innerHTML =
                `<div class="atraso-empty">
                    Selecione uma turma para visualizar os alunos.
                </div>`;

            return;
        }


        const search =
            (
                getElement(
                    "atraso-busca-aluno"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        const students =
            turma.alunos
                .filter(
                    aluno =>
                        aluno.situacao ===
                        "Matriculado"
                )
                .filter(aluno => {

                    if (!search) {
                        return true;
                    }

                    return (

                        aluno.nome
                            .toLowerCase()
                            .includes(search)

                        ||

                        String(
                            aluno.numeroChamada
                        ) === search

                    );

                })
                .sort(
                    (a, b) =>
                        a.numeroChamada -
                        b.numeroChamada
                );


        if (students.length === 0) {

            container.innerHTML =
                `<div class="atraso-empty">
                    Nenhum aluno matriculado encontrado.
                </div>`;

            return;
        }


        container.innerHTML =
            students.map(aluno => {

                const count =
                    getStudentDelayCount(
                        aluno.id
                    );

                const alerta =
                    count > 3
                        ? "alerta"
                        : "";

                return `

                    <button
                        type="button"
                        class="atraso-student-option ${alerta}"
                        data-select-student="${aluno.id}"
                    >

                        <span>

                            <strong>
                                ${aluno.numeroChamada}.
                                ${escapeHtml(aluno.nome)}
                            </strong>

                            <small>
                                Matriculado
                            </small>

                        </span>

                        <span class="atraso-student-count">
                            ${count} atraso(s)
                        </span>

                    </button>

                `;

            }).join("");

    }


    function selectStudent(alunoId) {

        const turma =
            getSelectedRegistrationTurma();

        if (!turma) {
            return;
        }

        const aluno =
            turma.alunos.find(
                item =>
                    item.id === alunoId &&
                    item.situacao ===
                    "Matriculado"
            );

        if (!aluno) {
            return;
        }

        state.alunoSelecionado = {

            alunoId: aluno.id,

            turmaId: turma.id

        };


        getElement(
            "atraso-aluno-selecionado"
        ).value = aluno.id;

        getElement(
            "atraso-aluno-selecionado-nome"
        ).textContent = aluno.nome;

        getElement(
            "atraso-aluno-selecionado-numero"
        ).textContent =
            aluno.numeroChamada;

        getElement(
            "atraso-aluno-selecionado-card"
        ).classList.remove("hidden");

        getElement(
            "atraso-lista-alunos-registro"
        ).classList.add("hidden");

        getElement(
            "atraso-busca-aluno"
        ).value = "";

    }


    function clearSelectedStudent() {

        getElement(
            "atraso-aluno-selecionado"
        ).value = "";

        getElement(
            "atraso-aluno-selecionado-card"
        ).classList.add("hidden");

    }


    /* =====================================================
       GERAÇÃO DE ID DE 5 DÍGITOS
    ====================================================== */

    function generateDelayId() {

        const used =
            new Set(
                state.registros.map(
                    registro =>
                        registro.id
                )
            );


        /*
         * Procura um número livre entre 00001 e 99999.
         */

        for (
            let number = 1;
            number <= 99999;
            number++
        ) {

            const id =
                String(number)
                    .padStart(5, "0");

            if (!used.has(id)) {
                return id;
            }

        }

        throw new Error(
            "Limite de 99.999 registros atingido."
        );

    }


    /* =====================================================
       SALVAR ATRASO
    ====================================================== */

    function registerDelay(event) {

        event.preventDefault();


        if (
            !hasPermission("registrar")
        ) {

            showToast(
                "Seu cargo não possui permissão para registrar atrasos.",
                "error"
            );

            return;
        }


        if (
            !state.currentUser
        ) {

            showToast(
                "Nenhum usuário autenticado.",
                "error"
            );

            return;
        }


        if (
            !state.alunoSelecionado
        ) {

            showToast(
                "Selecione um aluno.",
                "error"
            );

            return;
        }


        const turma =
            state.turmas.find(
                item =>
                    item.id ===
                    state.alunoSelecionado.turmaId
            );


        if (!turma) {

            showToast(
                "Turma não encontrada.",
                "error"
            );

            return;
        }


        const aluno =
            turma.alunos.find(
                item =>
                    item.id ===
                    state.alunoSelecionado.alunoId
            );


        if (
            !aluno ||
            aluno.situacao !==
            "Matriculado"
        ) {

            showToast(
                "Somente alunos matriculados podem receber registros.",
                "error"
            );

            return;
        }


        const data =
            getElement(
                "atraso-data"
            ).value;

        const hora =
            getElement(
                "atraso-hora"
            ).value;

        const justificado =
            getElement(
                "atraso-justificado"
            ).checked;


        if (!data || !hora) {

            showToast(
                "Informe data e hora.",
                "error"
            );

            return;
        }


        const id =
            generateDelayId();


        const registro = {

            id,

            alunoId: aluno.id,

            alunoNome:
                aluno.nome,

            turmaId:
                turma.id,

            turmaNome:
                turma.nome,

            numeroChamada:
                aluno.numeroChamada,

            data,

            hora,

            justificado,

            status:
                justificado
                    ? "Justificado"
                    : "Não justificado",

            usuarioId:
                state.currentUser.id,

            usuarioNome:
                state.currentUser.nome,

            criadoEm:
                new Date().toISOString()

        };


        state.registros.push(
            registro
        );

        saveRegistros();


        showToast(
            `Atraso registrado com sucesso. ID: ${id}`,
            "success"
        );


        resetRegistrationForm();

        refreshAll();

    }


    function resetRegistrationForm() {

        getElement(
            "atraso-form-registro"
        )?.reset();

        state.turmaRegistro = "";

        state.alunoSelecionado = null;

        clearSelectedStudent();

        initializeDateTime();

        renderRegistrationStudents();

    }


    /* =====================================================
       CONSULTAS
    ====================================================== */

    function setupConsultas() {

        getElement(
            "atraso-filtro-turma"
        )?.addEventListener(
            "change",
            renderConsultas
        );


        getElement(
            "atraso-filtro-aluno"
        )?.addEventListener(
            "input",
            renderConsultas
        );


        getElement(
            "atraso-btn-buscar-id"
        )?.addEventListener(
            "click",
            searchById
        );


        getElement(
            "atraso-busca-id"
        )?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    searchById();

                }

            }
        );


        getElement(
            "atraso-exportar"
        )?.addEventListener(
            "click",
            exportExcel
        );

    }


    function getFilteredRecords() {

        const turmaId =
            getElement(
                "atraso-filtro-turma"
            )?.value || "";


        const alunoSearch =
            (
                getElement(
                    "atraso-filtro-aluno"
                )?.value || ""
            )
                .trim()
                .toLowerCase();


        return state.registros
            .filter(registro => {

                if (
                    turmaId &&
                    registro.turmaId !== turmaId
                ) {
                    return false;
                }

                if (!alunoSearch) {
                    return true;
                }

                return (

                    registro.alunoNome
                        .toLowerCase()
                        .includes(
                            alunoSearch
                        )

                    ||

                    String(
                        registro.numeroChamada
                    ) === alunoSearch

                );

            })
            .sort(
                compareDateTimeDesc
            );

    }


    function compareDateTimeDesc(a, b) {

        const dateA =
            new Date(
                `${a.data}T${a.hora}`
            );

        const dateB =
            new Date(
                `${b.data}T${b.hora}`
            );

        return dateB - dateA;

    }


    function renderConsultas() {

        if (
            !hasPermission("consultar")
        ) {
            return;
        }


        const registros =
            getFilteredRecords();


        const tbody =
            getElement(
                "atraso-tbody-consultas"
            );

        const empty =
            getElement(
                "atraso-consulta-vazia"
            );


        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        if (registros.length === 0) {

            empty?.classList.remove(
                "hidden"
            );

        } else {

            empty?.classList.add(
                "hidden"
            );

        }


        registros.forEach(
            registro => {

                const count =
                    getStudentDelayCount(
                        registro.alunoId
                    );

                const tr =
                    document.createElement(
                        "tr"
                    );


                if (count > 3) {
                    tr.classList.add(
                        "atraso-alerta"
                    );
                }


                tr.innerHTML = `

                    <td>
                        <span class="atraso-id">
                            ${registro.id}
                        </span>
                    </td>

                    <td>
                        ${formatDate(
                            registro.data
                        )}
                    </td>

                    <td>
                        ${registro.hora}
                    </td>

                    <td>
                        ${escapeHtml(
                            registro.alunoNome
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            registro.turmaNome
                        )}
                    </td>

                    <td>
                        ${registro.numeroChamada}
                    </td>

                    <td>
                        <span class="atraso-status ${
                            registro.justificado
                                ? "justificado"
                                : "nao-justificado"
                        }">
                            ${
                                registro.justificado
                                    ? "Justificado"
                                    : "Não justificado"
                            }
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(
                            registro.usuarioNome
                        )}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="atraso-btn atraso-btn-secondary atraso-btn-small"
                            data-open-history="${registro.alunoId}"
                        >
                            Histórico
                        </button>

                    </td>

                `;


                tbody.appendChild(tr);

            }
        );


        updateStats();

    }


    function updateStats() {

        const registros =
            getFilteredRecords();


        const alunos =
            new Set(
                registros.map(
                    registro =>
                        registro.alunoId
                )
            );


        const alertas =
            Array.from(
                new Set(
                    state.registros
                        .filter(
                            registro =>
                                getStudentDelayCount(
                                    registro.alunoId
                                ) > 3
                        )
                        .map(
                            registro =>
                                registro.alunoId
                        )
                )
            );


        getElement(
            "atraso-stat-total"
        ).textContent =
            registros.length;


        getElement(
            "atraso-stat-alunos"
        ).textContent =
            alunos.size;


        getElement(
            "atraso-stat-alertas"
        ).textContent =
            alertas.length;

    }


    /* =====================================================
       BUSCA POR ID
    ====================================================== */

    function searchById() {

        const input =
            getElement(
                "atraso-busca-id"
            );

        const container =
            getElement(
                "atraso-resultado-id"
            );


        const id =
            input.value
                .replace(/\D/g, "")
                .padStart(5, "0");


        input.value = id;


        if (
            !/^\d{5}$/.test(id)
        ) {

            container.innerHTML =
                `<div class="atraso-empty">
                    Digite um ID de 5 dígitos.
                </div>`;

            return;
        }


        const registro =
            state.registros.find(
                item =>
                    item.id === id
            );


        if (!registro) {

            container.innerHTML =
                `<div class="atraso-empty atraso-danger-text">
                    Registro ${id} não encontrado.
                </div>`;

            return;
        }


        container.innerHTML = `

            <div class="atraso-card atraso-search-result">

                <strong>
                    Registro #${registro.id}
                </strong>

                <p>
                    <b>Aluno:</b>
                    ${escapeHtml(registro.alunoNome)}
                </p>

                <p>
                    <b>Turma:</b>
                    ${escapeHtml(registro.turmaNome)}
                </p>

                <p>
                    <b>Data:</b>
                    ${formatDate(registro.data)}
                    às ${registro.hora}
                </p>

                <p>
                    <b>Status:</b>
                    ${registro.status}
                </p>

                <p>
                    <b>Registrado por:</b>
                    ${escapeHtml(registro.usuarioNome)}
                </p>

                <button
                    type="button"
                    class="atraso-btn atraso-btn-secondary"
                    data-open-history="${registro.alunoId}"
                >
                    Ver histórico do aluno
                </button>

            </div>

        `;

    }


    /* =====================================================
       HISTÓRICO INDIVIDUAL
    ====================================================== */

    function openStudentHistory(alunoId) {

        if (
            !hasPermission("consultar")
        ) {
            return;
        }


        const registros =
            state.registros
                .filter(
                    registro =>
                        registro.alunoId ===
                        alunoId
                )
                .sort(
                    compareDateTimeDesc
                );


        let aluno = null;
        let turma = null;


        for (
            const turmaItem
            of state.turmas
        ) {

            const found =
                turmaItem.alunos.find(
                    item =>
                        item.id ===
                        alunoId
                );

            if (found) {

                aluno = found;
                turma = turmaItem;

                break;

            }

        }


        if (!aluno) {

            const registro =
                registros[0];

            if (registro) {

                aluno = {
                    nome:
                        registro.alunoNome,

                    numeroChamada:
                        registro.numeroChamada
                };

                turma = {
                    nome:
                        registro.turmaNome
                };

            }

        }


        if (!aluno) {
            return;
        }


        getElement(
            "atraso-modal-aluno-nome"
        ).textContent =
            aluno.nome;


        getElement(
            "atraso-modal-aluno-info"
        ).innerHTML = `

            <div class="atraso-card">

                <strong>
                    Turma:
                </strong>

                ${escapeHtml(
                    turma?.nome || "-"
                )}

                &nbsp;&nbsp;

                <strong>
                    Chamada:
                </strong>

                ${aluno.numeroChamada || "-"}

                &nbsp;&nbsp;

                <strong>
                    Total de atrasos:
                </strong>

                ${registros.length}

            </div>

        `;


        const tbody =
            getElement(
                "atraso-modal-historico-body"
            );


        tbody.innerHTML =
            registros.length
                ? registros.map(
                    registro => `

                        <tr>

                            <td>
                                <span class="atraso-id">
                                    ${registro.id}
                                </span>
                            </td>

                            <td>
                                ${formatDate(
                                    registro.data
                                )}
                            </td>

                            <td>
                                ${registro.hora}
                            </td>

                            <td>
                                <span class="atraso-status ${
                                    registro.justificado
                                        ? "justificado"
                                        : "nao-justificado"
                                }">
                                    ${registro.status}
                                </span>
                            </td>

                            <td>
                                ${escapeHtml(
                                    registro.usuarioNome
                                )}
                            </td>

                        </tr>

                    `
                ).join("")
                :
                `
                    <tr>
                        <td colspan="5">
                            Nenhum atraso registrado.
                        </td>
                    </tr>
                `;


        openModal(
            "atraso-modal-historico"
        );

    }


    /* =====================================================
       USUÁRIOS
    ====================================================== */

    function createUser(event) {

        event.preventDefault();


        if (
            !hasPermission("usuarios")
        ) {

            showToast(
                "Acesso negado.",
                "error"
            );

            return;
        }


        const nome =
            getElement(
                "atraso-usuario-nome"
            ).value.trim();


        const username =
            getElement(
                "atraso-usuario-login"
            ).value.trim();


        const password =
            getElement(
                "atraso-usuario-senha"
            ).value;


        const cargo =
            getElement(
                "atraso-usuario-cargo"
            ).value;


        if (
            !nome ||
            !username ||
            !password ||
            !cargo
        ) {

            showToast(
                "Preencha todos os campos.",
                "error"
            );

            return;
        }


        const loginExists =
            state.users.some(
                user =>
                    user.username
                        .toLowerCase() ===
                    username.toLowerCase()
            );


        if (loginExists) {

            showToast(
                "Esse nome de usuário já existe.",
                "error"
            );

            return;
        }


        state.users.push({

            id:
                generateId("USR"),

            nome,

            username,

            password,

            cargo,

            criadoEm:
                new Date().toISOString()

        });


        saveUsers();

        event.target.reset();

        renderUsers();

        showToast(
            "Usuário criado com sucesso.",
            "success"
        );

    }


    function renderUsers() {

        const container =
            getElement(
                "atraso-lista-usuarios"
            );


        if (!container) {
            return;
        }


        if (state.users.length === 0) {

            container.innerHTML =
                `<div class="atraso-empty">
                    Nenhum usuário cadastrado.
                </div>`;

            return;
        }


        container.innerHTML =
            state.users.map(
                user => `

                    <div class="atraso-user-item">

                        <div class="atraso-user-info">

                            <strong>
                                ${escapeHtml(
                                    user.nome
                                )}
                            </strong>

                            <span>
                                Login:
                                ${escapeHtml(
                                    user.username
                                )}
                            </span>

                        </div>

                        <div>

                            <span class="atraso-role-badge">
                                ${
                                    ROLE_LABELS[
                                        user.cargo
                                    ] ||
                                    user.cargo
                                }
                            </span>

                            ${
                                user.username !== "admin"
                                    ? `
                                        <button
                                            type="button"
                                            class="atraso-btn atraso-btn-danger atraso-btn-small"
                                            data-delete-user="${user.id}"
                                        >
                                            Excluir
                                        </button>
                                      `
                                    : ""
                            }

                        </div>

                    </div>

                `
            ).join("");

    }


    function deleteUser(userId) {

        if (
            !hasPermission("usuarios")
        ) {
            return;
        }


        const user =
            state.users.find(
                item =>
                    item.id === userId
            );


        if (!user) {
            return;
        }


        if (
            user.username === "admin"
        ) {

            showToast(
                "A conta admin padrão não pode ser excluída.",
                "error"
            );

            return;
        }


        const confirmed =
            window.confirm(
                `Excluir o usuário "${user.nome}"?`
            );


        if (!confirmed) {
            return;
        }


        state.users =
            state.users.filter(
                item =>
                    item.id !== userId
            );


        saveUsers();

        renderUsers();

        showToast(
            "Usuário excluído.",
            "success"
        );

    }


    /* =====================================================
       ALTERAÇÃO DE SENHA
    ====================================================== */

    function changeOwnPassword(event) {

        event.preventDefault();


        if (!state.currentUser) {

            showToast(
                "Usuário não autenticado.",
                "error"
            );

            return;
        }


        const current =
            getElement(
                "atraso-senha-atual"
            ).value;


        const newPassword =
            getElement(
                "atraso-nova-senha"
            ).value;


        const confirmation =
            getElement(
                "atraso-confirmar-senha"
            ).value;


        if (
            current !==
            state.currentUser.password
        ) {

            showToast(
                "A senha atual está incorreta.",
                "error"
            );

            return;
        }


        if (
            newPassword !==
            confirmation
        ) {

            showToast(
                "As novas senhas não são iguais.",
                "error"
            );

            return;
        }


        if (
            newPassword.length < 6
        ) {

            showToast(
                "A nova senha deve possuir pelo menos 6 caracteres.",
                "error"
            );

            return;
        }


        const userIndex =
            state.users.findIndex(
                user =>
                    user.id ===
                    state.currentUser.id
            );


        if (userIndex === -1) {
            return;
        }


        state.users[userIndex].password =
            newPassword;


        state.currentUser =
            state.users[userIndex];


        saveUsers();
        saveSession();


        event.target.reset();


        showToast(
            "Senha atualizada com sucesso.",
            "success"
        );

    }


    /* =====================================================
       EXPORTAÇÃO EXCEL
    ====================================================== */

    function exportExcel() {

        if (
            !hasPermission("exportar")
        ) {

            showToast(
                "Seu cargo não possui permissão para exportar.",
                "error"
            );

            return;
        }


        if (
            typeof XLSX === "undefined"
        ) {

            showToast(
                "A biblioteca SheetJS não foi carregada.",
                "error"
            );

            return;
        }


        const workbook =
            XLSX.utils.book_new();


        /* -------------------------------------------------
           ABA 1: REGISTRO GERAL
        -------------------------------------------------- */

        const registrosOrdenados =
            [...state.registros]
                .sort(
                    compareDateTimeAsc
                );


        const geralData =
            registrosOrdenados.map(
                registro => ({

                    ID:
                        registro.id,

                    Data:
                        formatDate(
                            registro.data
                        ),

                    Hora:
                        registro.hora,

                    Aluno:
                        registro.alunoNome,

                    Turma:
                        registro.turmaNome,

                    "Nº Chamada":
                        registro.numeroChamada,

                    Status:
                        registro.status,

                    "Registrado por":
                        registro.usuarioNome,

                    "Data de criação":
                        formatDateTime(
                            registro.criadoEm
                        )

                })
            );


        const geralSheet =
            XLSX.utils.json_to_sheet(
                geralData
            );


        XLSX.utils.book_append_sheet(
            workbook,
            geralSheet,
            "Registro Geral"
        );


        /* -------------------------------------------------
           ABAS POR TURMA
        -------------------------------------------------- */

        state.turmas
            .sort(
                (a, b) =>
                    a.nome.localeCompare(
                        b.nome,
                        "pt-BR"
                    )
            )
            .forEach(turma => {

                const alunos =
                    [...turma.alunos]
                        .sort(
                            (a, b) =>
                                a.numeroChamada -
                                b.numeroChamada
                        );


                const turmaRows =
                    alunos.map(aluno => {

                        const registrosAluno =
                            state.registros
                                .filter(
                                    registro =>
                                        registro.alunoId ===
                                        aluno.id &&
                                        registro.turmaId ===
                                        turma.id
                                )
                                .sort(
                                    compareDateTimeAsc
                                );


                        const row = {

                            "Nº Chamada":
                                aluno.numeroChamada,

                            "Aluno":
                                aluno.nome,

                            "Situação":
                                aluno.situacao

                        };


                        registrosAluno.forEach(
                            (registro, index) => {

                                row[
                                    `Atraso ${index + 1}`
                                ] =
                                    `${formatDate(
                                        registro.data
                                    )} ${registro.hora}`;

                            }
                        );


                        return row;

                    });


                /*
                 * O Excel deve possuir no mínimo as colunas
                 * de chamada, aluno e situação.
                 *
                 * As demais colunas são criadas
                 * sequencialmente conforme os atrasos.
                 */

                const sheet =
                    XLSX.utils.json_to_sheet(
                        turmaRows
                    );


                const safeSheetName =
                    sanitizeSheetName(
                        turma.nome
                    );


                XLSX.utils.book_append_sheet(
                    workbook,
                    sheet,
                    safeSheetName
                );

            });


        /* -------------------------------------------------
           DOWNLOAD
        -------------------------------------------------- */

        const date =
            new Date();

        const filename =
            `Gestao_Atrasos_${date.getFullYear()}-` +
            `${pad(date.getMonth() + 1)}-` +
            `${pad(date.getDate())}.xlsx`;


        XLSX.writeFile(
            workbook,
            filename
        );


        showToast(
            "Planilha gerada com sucesso.",
            "success"
        );

    }


    function compareDateTimeAsc(a, b) {

        const dateA =
            new Date(
                `${a.data}T${a.hora}`
            );

        const dateB =
            new Date(
                `${b.data}T${b.hora}`
            );

        return dateA - dateB;

    }


    function sanitizeSheetName(name) {

        /*
         * Excel não permite:
         * \ / ? * [ ]
         */

        let safe =
            name.replace(
                /[\\\/\?\*\[\]\:]/g,
                "-"
            );


        if (!safe.trim()) {
            safe = "Turma";
        }


        return safe
            .substring(0, 31);

    }


    /* =====================================================
       FORMATAÇÃO
    ====================================================== */

    function formatDate(dateString) {

        if (!dateString) {
            return "-";
        }

        const [
            year,
            month,
            day
        ] =
            dateString.split("-");


        return `${day}/${month}/${year}`;

    }


    function formatDateTime(iso) {

        if (!iso) {
            return "-";
        }

        const date =
            new Date(iso);

        return (
            formatDate(
                `${date.getFullYear()}-` +
                `${pad(date.getMonth() + 1)}-` +
                `${pad(date.getDate())}`
            ) +
            " " +
            `${pad(date.getHours())}:` +
            `${pad(date.getMinutes())}`
        );

    }


    /* =====================================================
       MODAL
    ====================================================== */

    function openModal(id) {

        const modal =
            getElement(id);

        if (!modal) {
            return;
        }

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeModal(id) {

        const modal =
            getElement(id);

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    function setupModals() {

        $$("[data-atraso-close]").forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const target =
                            button.dataset.atrasoClose;

                        if (
                            target ===
                            "historico"
                        ) {

                            closeModal(
                                "atraso-modal-historico"
                            );

                        }

                    }
                );

            }
        );


        getElement(
            "atraso-modal-historico"
        )?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "atraso-modal-historico"
                ) {

                    closeModal(
                        "atraso-modal-historico"
                    );

                }

            }
        );

    }


    /* =====================================================
       EVENT DELEGAÇÃO
    ====================================================== */

    function setupDelegatedEvents() {

        document.addEventListener(
            "click",
            event => {

                const studentButton =
                    event.target.closest(
                        "[data-select-student]"
                    );


                if (studentButton) {

                    selectStudent(
                        studentButton.dataset
                            .selectStudent
                    );

                    return;
                }


                const historyButton =
                    event.target.closest(
                        "[data-open-history]"
                    );


                if (historyButton) {

                    openStudentHistory(
                        historyButton.dataset
                            .openHistory
                    );

                    return;
                }


                const deleteUserButton =
                    event.target.closest(
                        "[data-delete-user]"
                    );


                if (deleteUserButton) {

                    deleteUser(
                        deleteUserButton.dataset
                            .deleteUser
                    );

                    return;
                }


                const deleteTurmaButton =
                    event.target.closest(
                        "[data-delete-turma]"
                    );


                if (deleteTurmaButton) {

                    deleteTurma(
                        deleteTurmaButton.dataset
                            .deleteTurma
                    );

                    return;
                }

            }
        );


        document.addEventListener(
            "change",
            event => {

                const select =
                    event.target.closest(
                        "[data-aluno-status]"
                    );


                if (!select) {
                    return;
                }


                changeStudentStatus(

                    select.dataset.turmaId,

                    select.dataset.alunoStatus,

                    select.value

                );

            }
        );

    }


    /* =====================================================
       TOAST
    ====================================================== */

    let toastTimer = null;


    function showToast(
        message,
        type = ""
    ) {

        const toast =
            getElement(
                "atraso-toast"
            );


        if (!toast) {
            return;
        }


        toast.textContent =
            message;


        toast.className =
            "atraso-toast show";


        if (type) {
            toast.classList.add(type);
        }


        clearTimeout(
            toastTimer
        );


        toastTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                3500
            );

    }


    /* =====================================================
       ESCAPE HTML
       Protege conteúdo inserido no HTML
    ====================================================== */

    function escapeHtml(value) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       REFRESH GERAL
    ====================================================== */

    function refreshAll() {

        updateCurrentUserUI();

        populateTurmaSelects();

        renderRegistrationStudents();

        if (
            hasPermission("consultar")
        ) {
            renderConsultas();
        }

        if (
            hasPermission("usuarios")
        ) {
            renderUsers();
        }

        if (
            hasPermission("turmas")
        ) {
            renderTurmasAdmin();
        }

    }


    /* =====================================================
       FORMULÁRIOS
    ====================================================== */

    function setupForms() {

        getElement(
            "atraso-form-usuario"
        )?.addEventListener(
            "submit",
            createUser
        );


        getElement(
            "atraso-form-turma"
        )?.addEventListener(
            "submit",
            createTurma
        );


        getElement(
            "atraso-form-senha"
        )?.addEventListener(
            "submit",
            changeOwnPassword
        );

    }


    /* =====================================================
       INICIALIZAÇÃO
    ====================================================== */

    function init() {

        /*
         * Não inicializa duas vezes.
         */

        if (
            window.__GESTAO_ATRASOS_INITIALIZED
        ) {
            return;
        }

        window.__GESTAO_ATRASOS_INITIALIZED =
            true;


        loadStorage();

        initializeDefaultAdmin();

        restoreSession();

        setupTabs();

        setupForms();

        setupRegistration();

        setupConsultas();

        setupModals();

        setupDelegatedEvents();

        initializeDateTime();

        populateTurmaSelects();

        updateCurrentUserUI();

        applyPermissions();

        refreshAll();


        /*
         * Se o sistema principal ainda não possui
         * autenticação integrada, usamos automaticamente
         * o administrador padrão para permitir testes.
         *
         * Em produção, substitua esta parte pelo usuário
         * real do seu sistema.
         */

        if (!state.currentUser) {

            const admin =
                state.users.find(
                    user =>
                        user.username ===
                        "admin"
                );


            if (admin) {

                setCurrentUser(
                    admin
                );

            }

        }

    }


    /* =====================================================
       API PÚBLICA
       
       Seu app.js pode chamar:
       
       GestaoAtrasos.init()
       GestaoAtrasos.setCurrentUser(usuario)
       GestaoAtrasos.logout()
       GestaoAtrasos.refresh()
       GestaoAtrasos.getState()
    ====================================================== */

    window.GestaoAtrasos = {

        init,

        setCurrentUser,

        logout,

        refresh:
            refreshAll,

        getState:
            () => ({
                users:
                    state.users,

                turmas:
                    state.turmas,

                registros:
                    state.registros,

                currentUser:
                    state.currentUser
            }),

        hasPermission

    };


    /* =====================================================
       AUTO INIT
    ====================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
