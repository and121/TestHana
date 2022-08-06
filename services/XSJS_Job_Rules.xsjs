//servicio de base de datos que cambia el estado de las cotizaciones en el portal Affinity
//se ejecuta en el change status
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "utility");
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "saveQuotation");
var utility = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.utility;
var save    = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.saveQuotation;
var jsonSave = {
    ID_AFFINITY: "",
    ID_COMPANY: "",
    ID_AFFINITY_EXTERNAL: "", 
    ID_QUOTATION_STATE:"",
    OBSERVATION:"",
    SUPPORTING_DOCUMENTATION: [],
    REASONS: [],
    HISTORY_STATUS_QUOTE: []
};

var json = {
        JsonEnv:[],
        Error: [],
        BusinessRule: [],
        Financiera:[],
        Financiera1M30:[],
        Financiera1B3060:[],
        Financiera1M60:[],
        Financiera2M30:[],
        Financiera2B3060:[],
        Financiera2M60:[],
        UpdataEstado:[],
        Cotizacion:[],
        Configuracion:[],
        Respuestas:[],
        Estado:"200",
        Respuesta:[],
        ResultadoSQL:[]
        },rs,flagT = true,
    obj = {destinoSQLA:"GESTION_CREDITICIA_PACKAGE_QAS",
        modo:""//T
    };

/*
try{
//        ID_COMPANY = $.request.parameters.get("ID_COMPANY");//ID_COMPANY=
        var JSONString = $.request.body.asString();
        var	JSONObj = JSON.parse(JSONString);
        }catch(e){
            json.Error.push({Code:'500',
                                Description:e.message,
                                Type:'E'
                            });  
            json.Estado = '500';
}

*/

/* 
Buscar Business Rules
*/

function buscarBusinessRules(){
    let oConn = $.hdb.getConnection();
    var cant = 0, rsT;
    
    let query = 'SELECT *'      
        + ' FROM "' + obj.destinoSQLA + '.data::master.BUSINESS_RULE_TABLE"';
        
       try{ 
            rsT = oConn.executeQuery(query);
            if (rsT.length > 0) {
                for (var item in rsT){
                    json.BusinessRule.push(rsT[item])      
                }
            }
            cant = rsT.length; 
        }catch(e){
             json.Error.push({Code:e.status,
                            TEXTO_ERROR:e.message,
                            TIPO_ERROR:e.name,
                            LOG_ERROR:"buscarFinancieras",
                            tQuery:query});
            json.Estado = 500;
        }    
    oConn.close();      
    return (cant > 0 ? true : false);
    
    
}

/*
Obtener Financieras ordenadas por prioridad
*/
function buscarFinancieras() {
    let oConn = $.hdb.getConnection();
    var cant = 0, rsT;
    let query = 'SELECT *'      
        + ' FROM "' + obj.destinoSQLA + '.data::master.COMPANY"'
        + ' WHERE PRIORITY > 0 AND ID_STATE = 1 ORDER BY PRIORITY;'; 
       try{ 
            rsT = oConn.executeQuery(query);
            if (rsT.length > 0) {
              json.Financiera.push(rsT);
            }
            cant = rsT.length; 
        }catch(e){
             json.Error.push({Code:e.status,
                            TEXTO_ERROR:e.message,
                            TIPO_ERROR:e.name,
                            LOG_ERROR:"buscarFinancieras",
                            tQuery:query});
            json.Estado = 500;
        }    
    oConn.close();      
    return (cant > 0 ? true : false);
    
}
/*
Leer Quotation + Historia ademas añade indicadores menor a 30min, entre 30min y 60min
y mayor a 60min
*/
function seleccionCotizacion() {
    var cant = 0, rsT;
    let oConn = $.hdb.getConnection();
    let query = 'SELECT *, SECONDS_BETWEEN(FECHA_INICIO, DATE) AS FECHA,'
        + ' CASE WHEN SECONDS_BETWEEN(FECHA_INICIO, DATE) >=0'
        + '  AND SECONDS_BETWEEN(FECHA_INICIO, DATE) <= 1800'
        + '  THEN 1'
        + '  ELSE 0'
        + '  END AS men30,'
        + '  CASE WHEN SECONDS_BETWEEN(FECHA_INICIO, DATE) > 1800'
        + '  AND SECONDS_BETWEEN(FECHA_INICIO, DATE) <= 3600'
        + '  THEN 1'
        + '  ELSE 0'
        + '  END AS bet3060,'
        + '  CASE WHEN SECONDS_BETWEEN(FECHA_INICIO, DATE) > 3600'
        + '  THEN 1'
        + '  ELSE 0'
        + '  END AS may60'
        + '  FROM ('      
        + '  SELECT Q.ID_AFFINITY, Q.ID_DOCUMENT_TYPE, Q.DOCUMENT_NUMBER, Q.APPLICATION_DATE, S.DATE,'
        + '  Q.ID_QUOTATION_STATE AS ESTADO_AFINITY, S.ID_COMPANY, C.PRIORITY, S.ID_QUOTATION_STATE,'
        + ' (SELECT DATE FROM "' + obj.destinoSQLA + '.data::quotation.HISTORY_STATUS_QUOTE"' 
        + '  WHERE ID_AFFINITY = Q.ID_AFFINITY AND ID_QUOTATION_STATE =\'002\') AS FECHA_INICIO'
        + '  FROM "' + obj.destinoSQLA + '.data::quotation.QUOTATION" AS Q'
        + '  INNER JOIN "' + obj.destinoSQLA + '.data::quotation.HISTORY_STATUS_QUOTE" AS S'
        + '  ON S.ID_AFFINITY = Q.ID_AFFINITY' 
        + '  INNER JOIN "' + obj.destinoSQLA + '.data::master.COMPANY" AS C'
        + '  ON C.ID_COMPANY = S.ID_COMPANY'
        + '  WHERE Q.ID_QUOTATION_STATE IN (\'002\',\'006\',\'007\')' 
        + '  AND S.ID_QUOTATION_STATE IN (\'201\',\'202\',\'401\',\'402\') AND (S.READ IS NULL OR S.READ <> \'X\') '
        + '  ORDER BY Q.ID_AFFINITY, S.DATE ASC, C.PRIORITY ASC'
        + '  ) WHERE FECHA_INICIO IS NOT NULL;';
       try{ 
            rsT = oConn.executeQuery(query);
            if (rsT.length > 0) {
              json.Cotizacion.push(rsT);
            }
            cant = rsT.length; 
        }catch(e){
             json.Error.push({Code:e.status,
                            TEXTO_ERROR:e.message,
                            TIPO_ERROR:e.name,
                            LOG_ERROR:"seleccionCotizacion",
                            tQuery:query});
            json.Estado = 500;
        }    
    oConn.close();      
    return (cant > 0 ? true : false);

}

/*
001 COTIZACIÓN
002 SOLICITUD ENVIADA OK
003 RECHAZADO         OK
004 ADJUDICADO B1     OK
005 ADJUDICADO B2     OK
006 EN EVALUACIÓN B1 OK
007 EN EVALUACIÓN B2 OK
008 BLOQUEADA
*/    
/*
Ejecuta el algoritmo de cambio de estados basado de financiera principal en los indicadores de tiempo
pero son fijos no leen de BUSINESS_RULE_TABLE
*/
function algoritmoFinancieraPrincipal(cCotiz, jJest) {
     var eEdoRech, eEdoAprob;
     eEdoAprob = utility.buscarEstadoPrevio(cCotiz.ID_AFFINITY,'201',obj.destinoSQLA,json);
     eEdoRech  = utility.buscarEstadoPrevio(cCotiz.ID_AFFINITY,'202',obj.destinoSQLA,json);
     
     var segundos = cCotiz.FECHA;
     var oBusinessRule = json.BusinessRule.find(e => e.RANGE_MIN <= segundos && e.RANGE_MAX >= segundos && e.ID_STATE_COMPANY === cCotiz.ID_QUOTATION_STATE && e.ID_QUOTATION_STATE === cCotiz.ESTADO_AFINITY);

     if (oBusinessRule != null){
        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
        jJest.ESTADO_AFINITY_AFTER    = oBusinessRule.ID_NEW_QUOTATION_STATE;
        jJest.DESCRIPTION             = utility.buscarEdoMaestro(jJest.ESTADO_AFINITY_AFTER, obj.destinoSQLA,json);            
     }
     
     
     /*
     if (cCotiz.ESTADO_AFINITY === '002') {  // SOLICITUD ENVIADA
     
            
            jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
            jJest.ESTADO_AFINITY_AFTER    = oBusinessRule  
            jJest.DESCRIPTION             = 'ADJUDICADO B1';        
            
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '401': // Aprobado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                    jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                    jJest.ESTADO_AFINITY_AFTER    = '004'; // 004 ADJUDICADO B1  
                    jJest.DESCRIPTION             = 'ADJUDICADO B1';
                }    
                break;            
            case '402': // Rechazado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHPRIPOST === 1 &&  eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } else {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '007'; // 007 EN EVALUACIÓN B2 
                        jJest.DESCRIPTION             = 'EN EVALUACIÓN B2';
                     }
                }     
                break;            
            }

     } else if (cCotiz.ESTADO_AFINITY === '006') { //EN EVALUACIÓN B1
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '401': // Aprobado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '004'; // 004 ADJUDICADO B1 
                        jJest.DESCRIPTION             = 'ADJUDICADO B1';
                } else if (cCotiz.bet3060 === 1) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '006'; // 006 EN EVALUACIÓN B1
                        jJest.DESCRIPTION             = 'EN EVALUACIÓN B1';
                }     
                break;            
            case '402': // Rechazado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHPRIPOST === 1 &&  eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } 
                } else if (cCotiz.bet3060 === 1) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '006'; // 006 EN EVALUACIÓN B1
                        jJest.DESCRIPTION             = 'EN EVALUACIÓN B1';
                }     
                break;            
            }

     } else if (cCotiz.ESTADO_AFINITY === '007') { //EN EVALUACIÓN B2
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '401': // Aprobado
                 break;            
            case '402': // Rechazado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHPRIPOST === 1 &&  eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } 
                }      
                break;            
            }
     }    
     */
}
/*
Ejecuta el algoritmo de cambio de estados de financiera secundaria basado en los indicadores de tiempo
pero son fijos no leen de BUSINESS_RULE_TABLE
*/
function algoritmoFinancieraSecundaria(cCotiz, jJest) {
     var eEdoRech, eEdoAprob;
     eEdoAprob = utility.buscarEstadoPrevio(cCotiz.ID_AFFINITY,'401',obj.destinoSQLA,json);
     eEdoRech  = utility.buscarEstadoPrevio(cCotiz.ID_AFFINITY,'402',obj.destinoSQLA,json);
     
     var segundos = cCotiz.FECHA;
     var oBusinessRule = json.BusinessRule.find(e => e.RANGE_MIN <= segundos && e.RANGE_MAX >= segundos && e.ID_STATE_COMPANY === cCotiz.ID_QUOTATION_STATE && e.ID_QUOTATION_STATE === cCotiz.ESTADO_AFINITY);
     
     if (oBusinessRule != null){
        jJest.ESTADO_HISTORIAL_BEFORE = cCotiz.ID_QUOTATION_STATE;
        jJest.ESTADO_AFINITY_AFTER    = oBusinessRule.ID_NEW_QUOTATION_STATE;
        jJest.DESCRIPTION             = utility.buscarEdoMaestro(jJest.ESTADO_AFINITY_AFTER, obj.destinoSQLA,json);            
     }     
     /*
     if (cCotiz.ESTADO_AFINITY === '002') {  // SOLICITUD ENVIADA
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '201': // Aprobado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                    jJest.ESTADO_AFINITY_AFTER    = '004'; // 004 ADJUDICADO B1  
                    jJest.DESCRIPTION             = 'ADJUDICADO B1';
                }     
                break;            
            case '202': // Rechazado
               if (cCotiz.bet3060 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHSECPOST === 1 && eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } else {
                        jJest.ESTADO_AFINITY_AFTER    = '006'; // 006 EN EVALUACIÓN B1  
                        jJest.DESCRIPTION             = 'EN EVALUACIÓN B1'; 
                     }
                }     
                break;            
            }

     } else if (cCotiz.ESTADO_AFINITY === '006') { //EN EVALUACIÓN B1
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '401': // Aprobado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                    jJest.ESTADO_AFINITY_AFTER    = '004'; // 004 ADJUDICADO B1  
                    jJest.DESCRIPTION             = 'ADJUDICADO B1';
                }     
                 break;            
            case '402': // Rechazado
                 if (cCotiz.bet3060 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHPRIPOST === 1 &&  eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } 
                 }     
                 break;            
            }

     } else if (cCotiz.ESTADO_AFINITY === '007') { //EN EVALUACIÓN B2
            switch(cCotiz.ID_QUOTATION_STATE) {
            case '401': // Aprobado
                if (cCotiz.MEN30 === 1  || cCotiz.MAY60 === 1) {
                    jJest.ESTADO_AFINITY_AFTER    = '005'; // 005 ADJUDICADO B2
                    jJest.DESCRIPTION             = 'ADJUDICADO B2';
                }     
                 break;            
            case '402': // Rechazado
                 if (cCotiz.bet3060 === 1  || cCotiz.MAY60 === 1) {
                     if (eEdoRech.RECHPRIPOST === 1 &&  eEdoRech.RECH_SEC !== null) {
                        jJest.ESTADO_AFINITY_AFTER    = '003'; // 003 RECHAZADO
                        jJest.DESCRIPTION             = 'RECHAZADO';
                     } 
                 }     
                break;            
            }
     }    
     */
}
/*
Realiza un bucle a las cotizaciones y actualiza los estados pero sin leer de la tabla BUSINESS_RULE_TABLE
Que esta fijo
*/
function leerRegCotizacion() {
 var i, eEdoRech, eEdoAprob;
  for(i = 0; i <  json.Cotizacion[0].length; i++) {
    let jEdo = {
           ID_COMPANY:"",
           ID_AFFINITY: "",
           ESTADO_AFINITY_BEFORE:"",
           ESTADO_AFINITY_AFTER:"",
           ESTADO_HISTORIAL_BEFORE:"",
           DATE:"",
           DESCRIPTION:"",
           ID_QUOTATION_STATE_APROBADO:"",
           ID_QUOTATION_STATE_RECHAZADO:"",
           DATA_SOLICITUD:""

    };  
    jEdo.ID_COMPANY              = json.Cotizacion[0][i].ID_COMPANY;
    jEdo.ID_AFFINITY             = json.Cotizacion[0][i].ID_AFFINITY;
    jEdo.ESTADO_AFINITY_BEFORE   = json.Cotizacion[0][i].ESTADO_AFINITY;
    jEdo.DATE                    = utility.fechaHora('UTC-5',json); //new Date();
    jEdo.DATA_SOLICITUD          = utility.buscarfechaSolicitudEnviada(json.Cotizacion[0][i].ID_AFFINITY,obj.destinoSQLA,json); //new Date();
    jEdo.ESTADO_HISTORIAL_BEFORE = json.Cotizacion[0][i].ID_QUOTATION_STATE;

    //var aEstados = utility.buscarEstados(json.Cotizacion[0][i].ID_AFFINITY,obj.destinoSQLA,json);
    
    //obtener la regla de negocio relacionada
    

    switch(json.Cotizacion[0][i].PRIORITY) { 
        case 1: // Financiera Principal
            algoritmoFinancieraPrincipal(json.Cotizacion[0][i], jEdo);
            break;            
        case 2: // Financiera Secundario
            algoritmoFinancieraSecundaria(json.Cotizacion[0][i], jEdo);
            break;            
    }
    jEdo.ID_QUOTATION_STATE_APROBADO  = eEdoAprob;
    jEdo.ID_QUOTATION_STATE_RECHAZADO = eEdoRech;
    json.UpdataEstado.push(jEdo);
    if (jEdo.ESTADO_AFINITY_AFTER === '003' || jEdo.ESTADO_AFINITY_AFTER === '004' ||
        jEdo.ESTADO_AFINITY_AFTER === '005' || jEdo.ESTADO_AFINITY_AFTER === '006' ||
        jEdo.ESTADO_AFINITY_AFTER === '007') {
        //save.guardarHistorialEdoCot(jsonSave.HISTORY_STATUS_QUOTE,json,obj);
        let jsonUpdateState = {
            ID_AFFINITY: "",
            ID_QUOTATION_STATE: "",
            APPLICATION_DATE:"",
            DATE_READ:"",
            ID_QUOTATION_STATE_HISTORY:""
            };
        jsonUpdateState.ID_AFFINITY                = json.Cotizacion[0][i].ID_AFFINITY;
        jsonUpdateState.ID_QUOTATION_STATE         = jEdo.ESTADO_AFINITY_AFTER;
        jsonUpdateState.APPLICATION_DATE           = jEdo.DATA_SOLICITUD;
        jsonUpdateState.DATE_READ                  = jEdo.DATE;
        jsonUpdateState.ID_QUOTATION_STATE_HISTORY = jEdo.ESTADO_HISTORIAL_BEFORE;
        let updateState = save.updateQuotationState(jsonUpdateState,obj.destinoSQLA,json);
        updateState = save.updateHistoryQuotationMarkRead(jsonUpdateState,obj.destinoSQLA,json);
       if (jEdo.ESTADO_AFINITY_AFTER === '004' || 
           jEdo.ESTADO_AFINITY_AFTER === '005' ) { // Adjudicada y se bloques Padre e Hijo
          updateState = save.updateQuotationStateBloqueado(json.Cotizacion[0][i].ID_AFFINITY,obj.destinoSQLA,json);    
       }    
    }

 }
}
/*
Leer Quotation + Historia
*/
function leerTablaConfiguracion() {
    var cant = 0, rsT;
    let oConn = $.hdb.getConnection();
    let query = 'SELECT *, SECONDS_BETWEEN(FECHA_INICIO, DATE) AS TIEMPO'
        + ' FROM ('
        + '  SELECT Q.ID_AFFINITY, Q.APPLICATION_DATE,'
        + '  Q.ID_QUOTATION_STATE AS ID_QUOTATION_STATE,'
        + '  S.ID_QUOTATION_STATE AS ID_STATUS_COMPANY,'
        + '  S.DATE,'
        + '  (SELECT DATE FROM "' + obj.destinoSQLA + '.data::quotation.HISTORY_STATUS_QUOTE"'
        + '  WHERE ID_AFFINITY = Q.ID_AFFINITY AND ID_QUOTATION_STATE =\'002\') AS FECHA_INICIO,'
        + '  C.PRIORITY'
        + '  FROM "' + obj.destinoSQLA + '.data::quotation.QUOTATION" AS Q'
        + '  INNER JOIN "' + obj.destinoSQLA + '.data::quotation.HISTORY_STATUS_QUOTE" AS S'
        + '  ON S.ID_AFFINITY = Q.ID_AFFINITY'
        + '  INNER JOIN "' + obj.destinoSQLA + '.data::master.COMPANY" AS C'
        + '  ON C.ID_COMPANY = S.ID_COMPANY'
        + '  WHERE Q.ID_QUOTATION_STATE IN (SELECT DISTINCT ID_QUOTATION_STATE FROM "' + obj.destinoSQLA + '.data::master.BUSINESS_RULE_TABLE"'
        + '  WHERE MARK_STATE = \'1\')'
        + '  AND S.ID_QUOTATION_STATE IN (SELECT DISTINCT ID_STATE_COMPANY FROM "' + obj.destinoSQLA + '.data::master.BUSINESS_RULE_TABLE"'
        + '  WHERE MARK_STATE = \'1\')'
        + '  AND (S.READ IS NULL OR S.READ <> \'X\')'
        + '  ORDER BY Q.ID_AFFINITY, S.DATE ASC, C.PRIORITY ASC);';
       try{ 
            rsT = oConn.executeQuery(query);
            if (rsT.length > 0) {
              json.Configuracion.push(rsT);
            }
            cant = rsT.length; 
        }catch(e){
             json.Error.push({Code:e.status,
                            TEXTO_ERROR:e.message,
                            TIPO_ERROR:e.name,
                            LOG_ERROR:"leerTablaConfiguracion",
                            tQuery:query});
            json.Estado = 500;
        }    
    oConn.close();      
    return (cant > 0 ? true : false);

}
function inicio() {
      leerTablaConfiguracion();
      buscarBusinessRules();
      seleccionCotizacion();
      if (json.Cotizacion.length > 0) {
          leerRegCotizacion();
      }
} 
inicio();
// $.response.setBody(JSON.stringify(jsonSave, null, "\t"));
$.response.setBody(JSON.stringify(json, null, "\t"));
$.response.contentType = "application/json; charset=UTF-8";
$.response.status = $.net.http.OK;