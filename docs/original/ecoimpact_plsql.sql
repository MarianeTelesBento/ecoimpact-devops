-- ============================================================
--  ATIVIDADE – AUTOMATIZANDO PROCESSOS ESG COM PL/SQL
--  Grupo 59
--  Luana Carolline Humer Bispo – rm562101
--  Mariane Teles Bento – rm566219
--  Pedro Jaime Fernandes da Cruz Russo – rm565511
--  Ricardo Caldas de Mello – rm565682
-- ============================================================
--  ECOIMPACT  |  Governanca e Compliance Ambiental
--  Modelagem de Dados (MER) + Automacoes com PL/SQL TRIGGERS
-- ============================================================
--  Tema: Monitoramento de Emissao de Carbono
--  Banco: Oracle (PL/SQL)
-- ============================================================

-- ============================================================
-- PARTE 1 - CRIACAO DAS TABELAS (MER)
-- ============================================================

-- Tabela 1: CATEGORIA_EMISSAO
-- Armazena os tipos de atividade que geram emissao de carbono
-- (ex: Transporte, Alimentacao, Energia, Residuos)
CREATE TABLE CATEGORIA_EMISSAO (
    ID               NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    NOME             VARCHAR2(100)   NOT NULL,
    DESCRICAO        VARCHAR2(500),
    FATOR_EMISSAO_KG NUMBER(10,4)    NOT NULL,  -- kg CO2e por unidade de medida
    UNIDADE_MEDIDA   VARCHAR2(30)    NOT NULL,  -- ex: 'km', 'porcao', 'kWh', 'kg'
    ATIVO            CHAR(1)         DEFAULT 'S' CHECK (ATIVO IN ('S','N')),
    CRIADO_EM        DATE            DEFAULT SYSDATE
);

COMMENT ON TABLE  CATEGORIA_EMISSAO                  IS 'Tipos de atividade e seus fatores de emissao de CO2 equivalente';
COMMENT ON COLUMN CATEGORIA_EMISSAO.FATOR_EMISSAO_KG IS 'Quilogramas de CO2e por unidade (ex: 0.21 kg CO2 por km de carro a gasolina)';


-- Tabela 2: REGISTRO_EMISSAO
-- Cada linha representa uma atividade diaria registrada pelo usuario na calculadora
CREATE TABLE REGISTRO_EMISSAO (
    ID                 NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_USUARIO         NUMBER         NOT NULL,        -- referencia ao usuario (tabela externa)
    ID_CATEGORIA       NUMBER         NOT NULL,
    DATA_REGISTRO      DATE           DEFAULT SYSDATE,
    QUANTIDADE         NUMBER(12,4)   NOT NULL,        -- qtd na unidade da categoria (km, porcoes, kWh)
    KG_CO2E            NUMBER(12,4)   NOT NULL,        -- kg CO2 equivalente calculado
    NIVEL_IMPACTO      VARCHAR2(10)   DEFAULT 'BAIXO'  -- preenchido automaticamente pela TRIGGER 4
                           CHECK (NIVEL_IMPACTO IN ('BAIXO','MEDIO','ALTO')),
    OBSERVACAO         VARCHAR2(300),
    CONSTRAINT FK_REGISTRO_CATEGORIA FOREIGN KEY (ID_CATEGORIA)
        REFERENCES CATEGORIA_EMISSAO(ID)
);

COMMENT ON TABLE  REGISTRO_EMISSAO               IS 'Registros diarios de atividades que geram emissao de carbono';
COMMENT ON COLUMN REGISTRO_EMISSAO.KG_CO2E       IS 'QUANTIDADE * FATOR_EMISSAO_KG da categoria';
COMMENT ON COLUMN REGISTRO_EMISSAO.NIVEL_IMPACTO IS 'Preenchido automaticamente: BAIXO(<10kg), MEDIO(10-50kg), ALTO(>50kg)';


-- Tabela 3: META_SUSTENTABILIDADE
-- Uma linha por usuario/mes: armazena a meta de reducao e o total acumulado
CREATE TABLE META_SUSTENTABILIDADE (
    ID                   NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_USUARIO           NUMBER        NOT NULL,
    ANO_MES              CHAR(7)       NOT NULL,   -- formato 'YYYY-MM', ex: '2024-11'
    META_REDUCAO_KG      NUMBER(12,4)  NOT NULL,   -- meta maxima de emissao para o mes
    TOTAL_EMITIDO_MES    NUMBER(12,4)  DEFAULT 0,  -- atualizado pela TRIGGER 1
    TOTAL_COMPENSADO_KG  NUMBER(12,4)  DEFAULT 0,  -- atualizado pela TRIGGER 3
    SALDO_CARBONO_KG     NUMBER(12,4)  DEFAULT 0,  -- TOTAL_EMITIDO - TOTAL_COMPENSADO
    ULTIMA_ATUALIZACAO   DATE          DEFAULT SYSDATE,
    CONSTRAINT UK_META_USUARIO_MES UNIQUE (ID_USUARIO, ANO_MES)
);

COMMENT ON TABLE  META_SUSTENTABILIDADE                  IS 'Meta mensal de emissao por usuario e totais acumulados';
COMMENT ON COLUMN META_SUSTENTABILIDADE.ANO_MES          IS 'Chave do periodo no formato YYYY-MM';
COMMENT ON COLUMN META_SUSTENTABILIDADE.SALDO_CARBONO_KG IS 'Pegada liquida = emitido - compensado; negativo = usuario compensou mais do que emitiu';


-- Tabela 4: ALERTA_EMISSAO
-- Alertas gerados automaticamente quando metas sao ultrapassadas (TRIGGER 2)
CREATE TABLE ALERTA_EMISSAO (
    ID                NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_META           NUMBER        NOT NULL,
    ID_USUARIO        NUMBER        NOT NULL,
    TIPO_ALERTA       VARCHAR2(30)  NOT NULL
                          CHECK (TIPO_ALERTA IN ('LIMITE_EXCEDIDO','CRITICO','AVISO_80PCT')),
    MENSAGEM          VARCHAR2(500) NOT NULL,
    KG_EXCEDIDO       NUMBER(12,4),            -- quanto ultrapassou a meta (kg)
    PERCENTUAL_META   NUMBER(6,2),             -- percentual da meta atingida (ex: 120.5%)
    GERADO_EM         DATE          DEFAULT SYSDATE,
    LIDO              CHAR(1)       DEFAULT 'N' CHECK (LIDO IN ('S','N')),
    CONSTRAINT FK_ALERTA_META FOREIGN KEY (ID_META)
        REFERENCES META_SUSTENTABILIDADE(ID)
);

COMMENT ON TABLE ALERTA_EMISSAO IS 'Alertas automaticos disparados quando o usuario ultrapassa metas de emissao';


-- Tabela 5: COMPENSACAO_CARBONO
-- Acoes de compensacao ambiental registradas pelo usuario (plantio de arvores, creditos, etc.)
CREATE TABLE COMPENSACAO_CARBONO (
    ID                 NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_USUARIO         NUMBER        NOT NULL,
    DATA_COMPENSACAO   DATE          DEFAULT SYSDATE,
    TIPO_ACAO          VARCHAR2(100) NOT NULL,    -- ex: 'Plantio de arvores', 'Credito de carbono'
    KG_COMPENSADO      NUMBER(12,4)  NOT NULL,    -- CO2e compensado em kg
    DESCRICAO          VARCHAR2(500),
    FONTE_CERTIFICACAO VARCHAR2(200),             -- entidade certificadora, se houver
    ANO_MES            CHAR(7)       NOT NULL     -- periodo de referencia 'YYYY-MM'
);

COMMENT ON TABLE COMPENSACAO_CARBONO IS 'Acoes voluntarias de compensacao de carbono realizadas pelo usuario';


-- ============================================================
-- PARTE 2 - INSERCAO DE REGISTROS INICIAIS
-- ============================================================

-- CATEGORIA_EMISSAO (6 registros)
INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Transporte - Gasolina', 'Veiculo particular movido a gasolina', 0.2100, 'km');

INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Transporte - Etanol', 'Veiculo particular movido a etanol', 0.0430, 'km');

INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Transporte - Eletrico', 'Veiculo eletrico (grid nacional)', 0.0900, 'km');

INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Alimentacao - Carne', 'Porcao de carne bovina (200g)', 6.6000, 'porcao');

INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Energia Eletrica', 'Consumo de eletricidade (grid nacional BR)', 0.0817, 'kWh');

INSERT INTO CATEGORIA_EMISSAO (NOME, DESCRICAO, FATOR_EMISSAO_KG, UNIDADE_MEDIDA)
VALUES ('Residuos Organicos', 'Descarte de residuos organicos sem compostagem', 0.5000, 'kg');


-- META_SUSTENTABILIDADE (5 registros - inseridos antes dos registros de emissao)
INSERT INTO META_SUSTENTABILIDADE (ID_USUARIO, ANO_MES, META_REDUCAO_KG)
VALUES (1, TO_CHAR(SYSDATE, 'YYYY-MM'), 100.0000);

INSERT INTO META_SUSTENTABILIDADE (ID_USUARIO, ANO_MES, META_REDUCAO_KG)
VALUES (2, TO_CHAR(SYSDATE, 'YYYY-MM'), 80.0000);

INSERT INTO META_SUSTENTABILIDADE (ID_USUARIO, ANO_MES, META_REDUCAO_KG)
VALUES (3, TO_CHAR(SYSDATE, 'YYYY-MM'), 120.0000);

INSERT INTO META_SUSTENTABILIDADE (ID_USUARIO, ANO_MES, META_REDUCAO_KG)
VALUES (4, TO_CHAR(SYSDATE, 'YYYY-MM'), 60.0000);

INSERT INTO META_SUSTENTABILIDADE (ID_USUARIO, ANO_MES, META_REDUCAO_KG)
VALUES (5, TO_CHAR(SYSDATE, 'YYYY-MM'), 90.0000);


-- REGISTRO_EMISSAO (8 registros)
-- NIVEL_IMPACTO sera preenchido automaticamente pela TRIGGER 4
INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (1, 1, 50, 10.5000, 'Trajeto diario trabalho - gasolina');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (1, 4, 3, 19.8000, 'Almoco com carne tres vezes na semana');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (2, 5, 300, 24.5100, 'Consumo eletrico residencial mensal');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (2, 1, 400, 84.0000, 'Viagem de carro longa distancia');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (3, 6, 10, 5.0000, 'Descarte semanal de organicos');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (3, 2, 200, 8.6000, 'Deslocamento de etanol');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (4, 4, 10, 66.0000, 'Churrasco de fim de semana');

INSERT INTO REGISTRO_EMISSAO (ID_USUARIO, ID_CATEGORIA, QUANTIDADE, KG_CO2E, OBSERVACAO)
VALUES (5, 3, 150, 13.5000, 'Deslocamento com veiculo eletrico');


-- COMPENSACAO_CARBONO (6 registros)
-- TOTAL_COMPENSADO_KG sera atualizado automaticamente pela TRIGGER 3
INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (1, 'Plantio de arvores', 20.0000, 'Plantio de 4 mudas nativas', 'SOS Mata Atlantica', TO_CHAR(SYSDATE, 'YYYY-MM'));

INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (2, 'Credito de carbono', 50.0000, 'Compra de credito certificado', 'VERRA VCS', TO_CHAR(SYSDATE, 'YYYY-MM'));

INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (3, 'Energia Solar', 15.0000, 'Geracao propria de energia fotovoltaica', NULL, TO_CHAR(SYSDATE, 'YYYY-MM'));

INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (4, 'Compostagem', 8.0000, 'Compostagem domiciliar de residuos organicos', NULL, TO_CHAR(SYSDATE, 'YYYY-MM'));

INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (5, 'Plantio de arvores', 30.0000, 'Patrocinio de reflorestamento', 'Instituto Ecofuturo', TO_CHAR(SYSDATE, 'YYYY-MM'));

INSERT INTO COMPENSACAO_CARBONO (ID_USUARIO, TIPO_ACAO, KG_COMPENSADO, DESCRICAO, FONTE_CERTIFICACAO, ANO_MES)
VALUES (1, 'Credito de carbono', 10.0000, 'Credito gerado por uso de transporte publico', 'Gold Standard', TO_CHAR(SYSDATE, 'YYYY-MM'));


-- ============================================================
-- PARTE 3 - TRIGGERS DE AUTOMACAO
-- ============================================================

SET SERVEROUTPUT ON;

-- ------------------------------------------------------------
-- TRIGGER 1 - TRG_ATUALIZA_META_EMISSAO
-- Tabela de origem : REGISTRO_EMISSAO
-- Evento           : AFTER INSERT OR UPDATE OR DELETE
-- Responsavel por atualizar TOTAL_EMITIDO_MES e recalcular
-- SALDO_CARBONO_KG na tabela META_SUSTENTABILIDADE sempre que
-- um registro de emissao for inserido, alterado ou removido.
-- Motivo da automacao: garante que o total mensal emitido pelo
-- usuario esteja sempre sincronizado sem depender de atualizacoes
-- manuais ou calculos na camada de aplicacao.
-- ------------------------------------------------------------

CREATE OR REPLACE TRIGGER TRG_ATUALIZA_META_EMISSAO
AFTER INSERT OR UPDATE OR DELETE ON REGISTRO_EMISSAO
FOR EACH ROW
DECLARE
    v_diferenca_kg NUMBER(12,4) := 0;
    v_id_usuario   NUMBER;
    v_data_ref     DATE;
BEGIN
    IF INSERTING THEN
        v_diferenca_kg := NVL(:NEW.KG_CO2E, 0);
        v_id_usuario   := :NEW.ID_USUARIO;
        v_data_ref     := :NEW.DATA_REGISTRO;

    ELSIF UPDATING THEN
        v_diferenca_kg := NVL(:NEW.KG_CO2E, 0) - NVL(:OLD.KG_CO2E, 0);
        v_id_usuario   := :NEW.ID_USUARIO;
        v_data_ref     := :NEW.DATA_REGISTRO;

    ELSIF DELETING THEN
        v_diferenca_kg := - NVL(:OLD.KG_CO2E, 0);
        v_id_usuario   := :OLD.ID_USUARIO;
        v_data_ref     := :OLD.DATA_REGISTRO;
    END IF;

    IF v_diferenca_kg != 0 THEN
        UPDATE META_SUSTENTABILIDADE
        SET TOTAL_EMITIDO_MES = NVL(TOTAL_EMITIDO_MES, 0) + v_diferenca_kg,
            SALDO_CARBONO_KG  = (NVL(TOTAL_EMITIDO_MES, 0) + v_diferenca_kg)
                                - NVL(TOTAL_COMPENSADO_KG, 0),
            ULTIMA_ATUALIZACAO = SYSDATE
        WHERE ID_USUARIO = v_id_usuario
          AND ANO_MES    = TO_CHAR(v_data_ref, 'YYYY-MM');
    END IF;

END TRG_ATUALIZA_META_EMISSAO;
/


-- ------------------------------------------------------------
-- TRIGGER 2 - TRG_ALERTA_EMISSAO
-- Tabela de origem : REGISTRO_EMISSAO
-- Evento           : AFTER INSERT OR UPDATE
-- Responsavel por inserir um registro em ALERTA_EMISSAO sempre
-- que o total projetado do usuario ultrapassar a META_REDUCAO_KG
-- definida para o mes corrente.
-- Motivo da automacao: notifica o usuario em tempo real sobre o
-- estouro da meta, sem exigir consultas periodicas ou intervencao
-- manual, centralizando a regra de alerta no banco de dados.
-- ------------------------------------------------------------

CREATE OR REPLACE TRIGGER TRG_ALERTA_EMISSAO
AFTER INSERT OR UPDATE ON REGISTRO_EMISSAO
FOR EACH ROW
DECLARE
    v_id_meta             NUMBER;
    v_meta_reducao        NUMBER(12,4);
    v_total_historico     NUMBER(12,4);
    v_incremento          NUMBER(12,4);
    v_novo_total_estimado NUMBER(12,4);
    v_kg_excedido         NUMBER(12,4);
    v_percentual          NUMBER(6,2);
    v_mensagem            VARCHAR2(500);
BEGIN
    -- 1. Buscar a meta do usuario no mes atual
    BEGIN
        SELECT ID, META_REDUCAO_KG, TOTAL_EMITIDO_MES
        INTO v_id_meta, v_meta_reducao, v_total_historico
        FROM META_SUSTENTABILIDADE
        WHERE ID_USUARIO = :NEW.ID_USUARIO
          AND ANO_MES    = TO_CHAR(SYSDATE, 'YYYY-MM');
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_id_meta := NULL;
    END;

    IF v_id_meta IS NOT NULL THEN

        -- 2. Calcular o delta da operacao atual
        IF INSERTING THEN
            v_incremento := NVL(:NEW.KG_CO2E, 0);
        ELSIF UPDATING THEN
            v_incremento := NVL(:NEW.KG_CO2E, 0) - NVL(:OLD.KG_CO2E, 0);
        END IF;

        v_novo_total_estimado := NVL(v_total_historico, 0) + v_incremento;

        -- 3. Verificar se a meta foi ultrapassada
        IF v_novo_total_estimado > v_meta_reducao THEN

            v_kg_excedido := v_novo_total_estimado - v_meta_reducao;
            v_percentual  := (v_novo_total_estimado / v_meta_reducao) * 100;
            v_mensagem    := 'Atencao! Sua emissao projetada (' || v_novo_total_estimado ||
                             ' kg) acaba de ultrapassar a meta limite de ' || v_meta_reducao || ' kg.';

            INSERT INTO ALERTA_EMISSAO (
                ID_META, ID_USUARIO, TIPO_ALERTA, MENSAGEM,
                KG_EXCEDIDO, PERCENTUAL_META, GERADO_EM, LIDO
            ) VALUES (
                v_id_meta, :NEW.ID_USUARIO, 'LIMITE_EXCEDIDO', v_mensagem,
                v_kg_excedido, v_percentual, SYSDATE, 'N'
            );

            DBMS_OUTPUT.PUT_LINE('==================================================');
            DBMS_OUTPUT.PUT_LINE('>>> ALERTA CRITICO: LIMITE DE CARBONO EXCEDIDO <<<');
            DBMS_OUTPUT.PUT_LINE('Usuario      : ' || :NEW.ID_USUARIO);
            DBMS_OUTPUT.PUT_LINE('Meta Mensal  : ' || v_meta_reducao || ' kg');
            DBMS_OUTPUT.PUT_LINE('Total Atingido: ' || v_novo_total_estimado || ' kg');
            DBMS_OUTPUT.PUT_LINE('Excedente    : ' || v_kg_excedido || ' kg (' || ROUND(v_percentual, 2) || '%)');
            DBMS_OUTPUT.PUT_LINE('==================================================');

        END IF;

    END IF;

END TRG_ALERTA_EMISSAO;
/


-- ------------------------------------------------------------
-- TRIGGER 3 - TRG_ATUALIZA_COMPENSACAO
-- Tabela de origem : COMPENSACAO_CARBONO
-- Evento           : AFTER INSERT OR UPDATE OR DELETE
-- Responsavel por atualizar TOTAL_COMPENSADO_KG e recalcular
-- SALDO_CARBONO_KG na tabela META_SUSTENTABILIDADE sempre que
-- uma compensacao for inserida, alterada ou removida.
-- Motivo da automacao: sem essa trigger o saldo liquido de
-- carbono ficaria desatualizado apos qualquer acao de compensacao,
-- tornando os relatorios e alertas imprecisos para o usuario.
-- ------------------------------------------------------------

CREATE OR REPLACE TRIGGER TRG_ATUALIZA_COMPENSACAO
AFTER INSERT OR UPDATE OR DELETE ON COMPENSACAO_CARBONO
FOR EACH ROW
DECLARE
    v_diferenca_kg NUMBER(12,4) := 0;
    v_id_usuario   NUMBER;
    v_ano_mes      CHAR(7);
BEGIN
    IF INSERTING THEN
        v_diferenca_kg := NVL(:NEW.KG_COMPENSADO, 0);
        v_id_usuario   := :NEW.ID_USUARIO;
        v_ano_mes      := :NEW.ANO_MES;

    ELSIF UPDATING THEN
        v_diferenca_kg := NVL(:NEW.KG_COMPENSADO, 0) - NVL(:OLD.KG_COMPENSADO, 0);
        v_id_usuario   := :NEW.ID_USUARIO;
        v_ano_mes      := :NEW.ANO_MES;

    ELSIF DELETING THEN
        v_diferenca_kg := - NVL(:OLD.KG_COMPENSADO, 0);
        v_id_usuario   := :OLD.ID_USUARIO;
        v_ano_mes      := :OLD.ANO_MES;
    END IF;

    IF v_diferenca_kg != 0 THEN
        UPDATE META_SUSTENTABILIDADE
        SET TOTAL_COMPENSADO_KG = NVL(TOTAL_COMPENSADO_KG, 0) + v_diferenca_kg,
            -- Saldo liquido: emitido menos compensado
            -- Valor negativo indica que o usuario compensou mais do que emitiu (credito)
            SALDO_CARBONO_KG    = NVL(TOTAL_EMITIDO_MES, 0)
                                  - (NVL(TOTAL_COMPENSADO_KG, 0) + v_diferenca_kg),
            ULTIMA_ATUALIZACAO  = SYSDATE
        WHERE ID_USUARIO = v_id_usuario
          AND ANO_MES    = v_ano_mes;

        DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
        DBMS_OUTPUT.PUT_LINE('>>> COMPENSACAO REGISTRADA: META ATUALIZADA <<<');
        DBMS_OUTPUT.PUT_LINE('Usuario : ' || v_id_usuario);
        DBMS_OUTPUT.PUT_LINE('Periodo : ' || v_ano_mes);
        DBMS_OUTPUT.PUT_LINE('Delta   : ' || v_diferenca_kg || ' kg CO2e');
        DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
    END IF;

END TRG_ATUALIZA_COMPENSACAO;
/


-- ------------------------------------------------------------
-- TRIGGER 4 - TRG_CLASSIFICA_NIVEL_IMPACTO
-- Tabela de origem : REGISTRO_EMISSAO
-- Evento           : BEFORE INSERT OR UPDATE OF KG_CO2E
-- Responsavel por preencher automaticamente o campo NIVEL_IMPACTO
-- antes de cada INSERT ou UPDATE com base no valor de KG_CO2E:
--   BAIXO  -> KG_CO2E <  10 kg
--   MEDIO  -> KG_CO2E entre 10 e 50 kg (inclusive)
--   ALTO   -> KG_CO2E >  50 kg
-- Motivo da automacao: elimina a necessidade de o sistema externo
-- calcular e enviar a classificacao, garantindo que a regra de
-- negocio seja sempre aplicada de forma consistente e centralizada
-- no banco de dados, independentemente da origem do dado.
-- ------------------------------------------------------------

CREATE OR REPLACE TRIGGER TRG_CLASSIFICA_NIVEL_IMPACTO
BEFORE INSERT OR UPDATE OF KG_CO2E ON REGISTRO_EMISSAO
FOR EACH ROW
BEGIN
    -- Classificacao calculada diretamente sobre :NEW.KG_CO2E
    -- e escrita em :NEW.NIVEL_IMPACTO antes de a linha ser gravada.
    -- Por ser BEFORE, o valor ja fica correto na propria instrucao DML.
    IF :NEW.KG_CO2E < 10 THEN
        :NEW.NIVEL_IMPACTO := 'BAIXO';

    ELSIF :NEW.KG_CO2E <= 50 THEN
        :NEW.NIVEL_IMPACTO := 'MEDIO';

    ELSE
        :NEW.NIVEL_IMPACTO := 'ALTO';
    END IF;

    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
    DBMS_OUTPUT.PUT_LINE('>>> NIVEL DE IMPACTO CLASSIFICADO <<<');
    DBMS_OUTPUT.PUT_LINE('KG CO2e : ' || :NEW.KG_CO2E);
    DBMS_OUTPUT.PUT_LINE('Nivel   : ' || :NEW.NIVEL_IMPACTO);
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');

END TRG_CLASSIFICA_NIVEL_IMPACTO;
/
