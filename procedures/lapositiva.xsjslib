$.import("GESTION_CREDITICIA_PACKAGE_QAS.procedures", "utility");	
var utility = $.GESTION_CREDITICIA_PACKAGE_QAS.procedures.utility;
var obj = {destinoSQLA:"GESTION_CREDITICIA_PACKAGE_QAS"};

function mapear(jsonCalcular, JSONObj, json) {
    jsonCalcular.LaPositiva.Usuario = JSONObj.VEHICLE.ID_SAP_VENDORS;

    let str = "BRANCH_OFFICE" + ";" + "ID_BRANCH_OFFICE" + ";" + "006" + ";" + JSONObj.VEHICLE.ID_BRANCH_OFFICE;   
    let valorHomo =  utility.homolagacionSalida(str,obj.destinoSQLA,json);
//    jsonCalcular.LaPositiva.CodSucursal = valorHomo;
    jsonCalcular.LaPositiva.CodSucursal = "GEN";
    
    str = "DOCUMENT_TYPE" + ";" + "ID_DOCUMENT_TYPE" + ";" + "006" + ";" + JSONObj.CUSTOMER.ID_DOCUMENT_TYPE;   
    valorHomo =  utility.homolagacionSalida(str,obj.destinoSQLA,json);
    if (valorHomo.length > 0) {
            jsonCalcular.LaPositiva.TipoDocumento      =  valorHomo; 
    }    
    jsonCalcular.LaPositiva.NumeroDocumento = JSONObj.CUSTOMER.DOCUMENT_NUMBER;
    jsonCalcular.LaPositiva.Apellido1 = JSONObj.CUSTOMER.LAST_NAME;
    jsonCalcular.LaPositiva.Apellido2 = JSONObj.CUSTOMER.MOTHERS_LAST_NAME;
    jsonCalcular.LaPositiva.Nombre1 = JSONObj.CUSTOMER.NAME;
    jsonCalcular.LaPositiva.Nombre2 = "";
    jsonCalcular.LaPositiva.Email = JSONObj.CUSTOMER.EMAIL;
    jsonCalcular.LaPositiva.Celular = JSONObj.CUSTOMER.CELL_PHONE;
    var yearVehic = parseInt(JSONObj.VEHICLE.YEAR_VEHIC, 0);
    if (yearVehic > 2022){
        yearVehic = 2022;
    }
    jsonCalcular.LaPositiva.AnioFabricacion = yearVehic;
    jsonCalcular.LaPositiva.AnioModelo = JSONObj.VEHICLE.YEAR_VEHIC;

    str = "VERSIONS" + ";" + "ID_VERSION" + ";" + "006" + ";" + JSONObj.VEHICLE.ID_VERSION; 
    valorHomo =  utility.homolagacionSalida(str,obj.destinoSQLA,json);
    jsonCalcular.LaPositiva.IDModeloVersion = valorHomo;

    str = "USE_VEHICLE_INSURANCE" + ";" + "ID_USE_VEHICLE" + ";" + "006" + ";" + JSONObj.VEHICLE.ID_USE_VEHICLE;   
    valorHomo =  utility.homolagacionSalida(str,obj.destinoSQLA,json);
    jsonCalcular.LaPositiva.IDUsoVehiculo = valorHomo;
    
    jsonCalcular.LaPositiva.IDUbicacion = JSONObj.CREDIT.LOCATION_INS;
    jsonCalcular.LaPositiva.NumeroPlaca = "EN TRAMITE";
    jsonCalcular.LaPositiva.IDMoneda = "USD";
    if (JSONObj.CREDIT.QUANTITIES_FEES_INS == 1){
        jsonCalcular.LaPositiva.NroCuotas = 0;
    }else{    
        jsonCalcular.LaPositiva.NroCuotas = JSONObj.CREDIT.QUANTITIES_FEES_INS;
    }
    
    jsonCalcular.LaPositiva.ValorVehiculo = JSONObj.CREDIT.AMOUNT_VEHIC;

    if (json.Error.length > 0 ) {
        return false;
    } else {
        return true;
    }
}

function calcular(JsonIn,jsonOut,dest){
    var salida = null;
    try {
        jsonOut.JsonEnv.push(JsonIn);
  		var client = new $.net.http.Client();
		
		//pendiente por definir
		var req = new $.net.http.Request($.net.http.POST, "/http/LAPOSITIVA/Quotation");
		req.setBody(JSON.stringify(JsonIn));
		client.request(req, dest);
		var responseT = client.getResponse();
		
//        jsonOut.Error.push(responseT.body.asString());  
//        jsonOut.Error.push(responseT.status);  
		try {
            var bodyT = JSON.parse(responseT.body.asString());
            if (bodyT.StatusCode !== 200){
                jsonOut.Estado = bodyT.StatusCode;
                jsonOut.Error.push(bodyT)
            }
            
            const aResultado = []
            
            bodyT.Resultado.forEach(function(item){
                const obj2 = {};
                obj2.Cotizacion = item.IDCotizacion;
                obj2.PrimaNeta = 0;
                obj2.PrimaBruta = item.Prima;
                obj2.IndicadorInspeccion = null;
                obj2.IndicadorGPS = item.RequiereGPS;
                obj2.Financiamiento = null;
                obj2.FechaInicio = null;
                obj2.FechaFin = null;
                obj2.NumeroDeCuotas = null;
                obj2.Producto = item.Producto;
                obj2.IDPrograma = item.IDPrograma;
                obj2.IDOpcion = null;
                obj2.FechaVencimiento = item.FechaVencimiento;
                aResultado.push(obj2);
            });
            
            let jResp = {
                IDEmpresa: "006",
				Empresa: "La Positiva",                
                Resultados: aResultado,
                ID_FINANCING_INS: bodyT.IDCotizacion
            };
            salida = jResp;
   	    } catch (e) {
            jsonOut.Error.push({
                "Type": "E",
                "Code": "P101", 
                "Description": "ERROR EN LLAMADA DE SERVICIO LAPOSITIVA FinancialCalculation: " + e.message
                			});
		}finally{
		    client.close();
		  //  req.close();
		}

  } catch (e) {
    jsonOut.Error.push({
                "Type": "E",
                "Code": "P101", 
                "Description": "ERROR EN LLAMADA DE SERVICIO LAPOSITIVA FinancialCalculation: " + e.message
                			});  
  }
    return salida;
  
}

function validacionPeru(JSONObj, json) {
// nombre campo, tipocampo L = Letra N = Numerico S = String, C = Cadena quietar Carcateres especiales, campo Mandatorio M 0 Mandatorio O = Opcional > = Mayor de cero 
 let str, res, rmod, valorHomo;
 
 str = "IDSALESFORCE" + ";" + "N" + ";" + "M" + ";" + ">";   
 res = utility.validarCampoFormato(JSONObj.DATACONTROL.IDSALESFORCE, str, json);
 str = "DOCUMENT_NUMBER" + ";" + "N" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.DOCUMENT_NUMBER, str, json);
 str = "NAME" + ";" + "L" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.NAME, str, json);
 str = "LAST_NAME" + ";" + "L" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.LAST_NAME, str, json);
 str = "MOTHERS_LAST_NAME" + ";" + "L" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.MOTHERS_LAST_NAME, str, json);
  str = "EMAIL" + ";" + "S" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.EMAIL, str, json);
 res = utility.validarEmail(JSONObj.CUSTOMER.EMAIL, json); 
 str = "CELL_PHONE" + ";" + "N" + ";" + "M" + ";" + "";    
 res = utility.validarCampoFormato(JSONObj.CUSTOMER.CELL_PHONE, str, json);
 str = "ID_MODEL" + ";" + "S" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.VEHICLE.ID_VERSION, str, json);
 if (res === true) {
     str = "VERSIONS" + ";" + "ID_VERSION" + ";" + "006" + ";" + JSONObj.VEHICLE.ID_VERSION;   
     valorHomo =  utility.homolagacionSalida(str,obj.destinoSQLA,json);
//     rmod = utility.validarModelo(JSONObj.VEHICLE.ID_MODEL, obj.destinoSQLA, json);
 }

 str = "YEAR_VEHIC" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.VEHICLE.YEAR_VEHIC, str, json);
 str = "ID_BRANCH_OFFICE" + ";" + "S" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.VEHICLE.ID_BRANCH_OFFICE, str, json);
 if (res === true) {
    res = utility.validarBranchOffice(JSONObj.VEHICLE.ID_BRANCH_OFFICE, obj.destinoSQLA, json);
 }  
 str = "ID_SAP_VENDORS" + ";" + "S" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.VEHICLE.ID_SAP_VENDORS, str, json);
 if (res === true) {
    res = utility.validarUser(JSONObj.VEHICLE.ID_SAP_VENDORS, obj.destinoSQLA, json, "01");
      if (res === true) {
        res = utility.validarSucursalRelacionUser(JSONObj.VEHICLE.ID_BRANCH_OFFICE ,JSONObj.VEHICLE.ID_SAP_VENDORS, obj.destinoSQLA, json, "01");
    }
 }  

 str = "AMOUNT_VEHIC" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.AMOUNT_VEHIC, str, json);
 
 str = "QUANTITIES_FEES_INS" + ";" + "N" + ";" + "M" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.QUANTITIES_FEES_INS, str, json);
 
 str = "LOCATION_INS" + ";" + "N" + ";" + "O" + ";" + ">";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.LOCATION_INS, str, json);
 
 str = "ID_FINANCING_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.ID_FINANCING_INS, str, json);

 var num = utility.validarLongitud(JSONObj.CREDIT.DATE_FINANTIAL_INS);
// if (num > 0) {
// res = utility.validarFecha(JSONObj.CREDIT.DATE_FINANTIAL_INS,json,"DATE_FINANTIAL_INS");
// }
 str = "PASSENGERS_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.PASSENGERS_INS, str, json);
 
 str = "FUEL_GAS_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.FUEL_GAS_INS, str, json);
 
 str = "WEB_MODALITY_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.WEB_MODALITY_INS, str, json);
 
 str = "ORIGIN_VEHICLE_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.ORIGIN_VEHICLE_INS, str, json);
 
 str = "CONTINUITY_INS" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.CREDIT.CONTINUITY_INS, str, json);

 num = utility.validarLongitud(JSONObj.DATACONTROL.CREATION_DATE);
 res = utility.validarFecha(JSONObj.DATACONTROL.CREATION_DATE,json,"CREATION_DATE");
 
 str = "ID_USE_VEHICLE" + ";" + "N" + ";" + "O" + ";" + "";   
 res = utility.validarCampoFormato(JSONObj.VEHICLE.ID_USE_VEHICLE, str, json);

 if (JSONObj.CUSTOMER.ID_DOCUMENT_TYPE.length > 0) {
        // Tabla, Campo, Tipo, Valor
        str = "DOCUMENT_TYPE" + ";" + "ID_DOCUMENT_TYPE" + ";" + "006" + ";" + JSONObj.CUSTOMER.ID_DOCUMENT_TYPE;   
        valorHomo     =  utility.homolagacionSalida(str,obj.destinoSQLA,json);

        let valordesc =  utility.validartipoDocumento(JSONObj.CUSTOMER.ID_DOCUMENT_TYPE,obj.destinoSQLA,json);
        if (valordesc.length > 0) {
           res =  utility.checkTipoDocumento(JSONObj.CUSTOMER.ID_DOCUMENT_TYPE,JSONObj.CUSTOMER.DOCUMENT_NUMBER,json); 
        }
 }

 if (json.Error.length > 0 ) {
      return false;
  } else {return true;}
    
}   