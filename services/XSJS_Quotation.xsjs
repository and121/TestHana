/*
Titulo:      Servicio XSJS_Quotation.xsjs 
Descripcion: Servicio que se utiliza en Sales Force / Affinity realiza el proceso de simulación
             y Consulta a Integraciones de Banco
Autor:       ??
*/
/*
MODIFICACIONES
************************************************************************************
Autor:      Eder Matienzo
Fecha:      22/02/2022
Motivo:     Homologación de id_sap_vendor cuando es Company = 003 es un correo
            y se tiene q ir a usuario para obtener el id_sap
Marca:      @001
************************************************************************************
Autor:      Eder Matienzo
Fecha:      24/02/2022
Motivo:     Guardar Log
Marca:      @002
*/
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "utility");
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "log");
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "lapositiva");
$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "santander");

var utility = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.utility;
var logg = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.log;
var lapositiva = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.lapositiva;
var santander = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.santander;

var jsonCalcular = {
    "Santander": {
    "ingresoNeto": "",
    "precioVehiculo": "",
    "tipoMonedaVehiculo": "",
    "monedaFinacionamiento": "",
    "usoVehiculo": "",
    "cuotas": "",
    "cuotaInicial": "",
    "tipoProducto": "",
    "cuotaFinal": "",
    "idProducto": "",
    "idMarca": "",
    "idModelo": ""
    },
    "LaPositiva":{
        
    }
};

var salidaRimac = 
    [{
      Producto: "Programa Premium",
      IDCotizacion: "2021-026177",
      Prima: "122.81",
      RequiereGPS: "1",
      IDPrograma: "101008"
    },
    {
      Producto: "Programa VIP",
      IDCotizacion: "2021-026178",
      Prima: "102.04",
      RequiereGPS: "1",
      IDPrograma: "101013"
    }];
    
var json = {
        JsonEnv:[],
        Error: [],
        Respuestas:[],
        Estado:"200",
        Respuesta:[],
        ResultadoSQL:[],
        CampoCadena:"",
        IDSalesForceRegistro:"",
        idAffinity: "",
        MessageId: ""
        },rs,flagT = true,
    obj = {destinoSQLA:"GESTION_CREDITICIA_PACKAGE_QAS",
        modo:""//T
    };


try{
        var JSONString = $.request.body.asString();
        var	JSONObj = JSON.parse(JSONString);
        }catch(e){
            json.Error.push({Code:'500',
                                Description:e.message,
                                Type:'E'
                            });  
            json.Estado = '500';
}

function inicio() {
    var dest = $.net.http.readDestination("GESTION_CREDITICIA_PACKAGE_QAS.services", "hci");
    
    //INS@002{
    if (JSONObj.DATACONTROL.IDSALESFORCE !== ""){
        var jsonLog = {};
    	jsonLog.ID_AFFINITY = 0;
    	jsonLog.IDSALESFORCE = JSONObj.DATACONTROL.IDSALESFORCE;
    	jsonLog.APPLICATION = "Simular Cotización";
    	jsonLog.FUNCTION = "Servicio Santander SalesForce";
    	jsonLog.TYPE = "I";
    	jsonLog.ORIGIN = "SALESFORCE";
    	jsonLog.CPI_ID = "";
    	jsonLog.CODE = "A200";
    	jsonLog.CONTENT = JSON.stringify(JSONObj);
    	logg.guardarLog(jsonLog, obj.destinoSQLA, json);        
    } 	    
    //}INS@002    
    
    if (!JSONObj.DATACONTROL.PROCESS){
        JSONObj.DATACONTROL.PROCESS = "B";
    }
    
    if (JSONObj.DATACONTROL.PROCESS === "AB" || JSONObj.DATACONTROL.PROCESS === "B"){
        if (santander.validacionPeruCotizacion(JSONObj, json) === true) {
            santander.mapearCotizacion(jsonCalcular, JSONObj, json);
            santander.calcularCotizacion(jsonCalcular.Santander, json, JSONObj, dest);
        }
    }
  
  if (JSONObj.DATACONTROL.PROCESS === "AB" || JSONObj.DATACONTROL.PROCESS === "A"){
      if (lapositiva.validacionPeru(JSONObj, json)){
            lapositiva.mapear(jsonCalcular, JSONObj, json);
            json.salidaLaPositiva = lapositiva.calcular(jsonCalcular.LaPositiva, json, dest);
      }      
  }


}    
inicio();
//json.Respuestas.push(JSONObj);
var jsonR = { 
    Error: json.Error,
    Entrada: json.JsonEnv,
    Respuestas: json.Respuestas,
    Estado: json.Estado,
//    Rimac:  salidaRimac
    LaPositiva: json.salidaLaPositiva
};
$.response.setBody(JSON.stringify(jsonR, null, "\t"));
$.response.contentType = "application/json; charset=UTF-8";
$.response.status = $.net.http.OK;