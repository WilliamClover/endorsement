
var notEmpty = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  callback(resNotEmpty.valid)
  return $("#text-error").html(resNotEmpty.message)
};
var employeeStaffId = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    var resMin2 = minLengthfunction(value, 2)
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  }
}
var namesValidation = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  var resMin2 = minLengthfunction(value, 2)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else if (!resMin2.valid) {
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  } else {
    var resLettersSpaces = lettersSpacesfunction(value)
    callback(resLettersSpaces.valid)
    return $("#text-error").html(resLettersSpaces.message)
  }
}
var min2ifNotEmpty = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  var resMin2 = minLengthfunction(value, 2)
  if (!resNotEmpty.valid) {
    callback(!resNotEmpty.valid)
    return $("#text-error").html("")
  } else if (!resMin2.valid) {
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  } else {
    var resLettersSpaces = lettersSpacesfunction(value)
    callback(resLettersSpaces.valid)
    return $("#text-error").html(resLettersSpaces.message)
  }
};
var acceptableDate = function (value = "", callback) {

  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    const dateParts = value.split("/");
    const timestampFromValue = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    const currentTimestamp = Date.now()
    const ageFromtimestamps = Math.floor((currentTimestamp - timestampFromValue) / (365 * 24 * 60 * 60 * 1000));
    var resValidateDate = validDatefunction(timestampFromValue)
    if (!resValidateDate.valid) {
      callback(resValidateDate.valid)
      return $("#text-error").html(resValidateDate.message)
    } else if (ageFromtimestamps > 99 || ageFromtimestamps < 0) {
      callback(false)
      return $("#text-error").html("Age should be from 0 to 99")
    } else if (relationValue == "3= CHILD" && ageFromtimestamps > 25) {
      callback(false)
      $("#text-error").html("Children should be under 25")
    } else {
      callback(true)
      $("#text-error").html("")
    }
  }
}
var positionField = function (value, callback) {
  if (relationValue == "1= PRINCIPAL" && nationalityValue == "Kingdom Of Saudi Arabia") {
    notEmpty(value, callback)
  } else {
    var resNotEmpty = notEmptyfunction(value)
    var resMin3 = minLengthfunction(value, 3)

    if (!resNotEmpty.valid) {
      callback(!resNotEmpty.valid)
      return $("#text-error").html("")
    } else if (!resMin3.valid) {
      callback(resMin3.valid)
      return $("#text-error").html(resMin3.message)
    } else {
      callback(true)
      $("#text-error").text("")
    }
  }
}
var alphaNumericIfNotEmpty = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    var resAlphaNumeric = alphaNumericfunction(value)
    callback(resAlphaNumeric.valid)
    return $("#text-error").html(resAlphaNumeric.message)
  }
}
var phoneNumberIfPrincipal = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    var resValidPhone = validPhoneFunction(value)
    //callback(resValidPhone.valid)
    callback(true)
    return $("#text-error").html(resValidPhone.message)

  } else if (!resNotEmpty.valid && relationValue == "1= PRINCIPAL") {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    callback(true)
    return $("#text-error").html("")
  }
}
var validEmailIfPrinciple = function (value, callback) {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    var resValidEmail = validEmailfunction(value)
    callback(resValidEmail.valid)
    return $("#text-error").html(resValidEmail.message)

  } else if (!resNotEmpty.valid && relationValue == "1= PRINCIPAL") {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    callback(true)
    return $("#text-error").html("")
  }
}

//HOT Validations Function --START--
function notEmptyfunction(value) {
  return {
    valid: (value) ? true : false,
    message: (value) ? "" : "This field is mandatory"
  }
}
function minLengthfunction(value, length) {
  return {
    valid: (String(value).length >= length) ? true : false,
    message: (String(value).length >= length) ? "" : "Must be at least " + length + " characters."
  }
}
function lettersSpacesfunction(value) {
  var regex = /^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be only alphabets"
  }
}
function validDatefunction(value = "") {
  return {
    valid: (!isNaN(value)) ? true : false,
    message: (!isNaN(value)) ? "" : "This field must have a valid date"
  }
}
function alphaNumericfunction(value) {
  var regex = /^[a-zA-Z0-9_]+$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be only alphanumeric"
  }
}
function validPhoneFunction(value) {
  const validPhoneFormat = $.ajax({
    type: "GET",
    url: "http://apilayer.net/api/validate",
    dataType: "json",
    data: { access_key: "386661ddd43191ec181a736418ab4702", number: value },
    async: false,
    done: function (results) {
      JSON.parse(results);
      return results;
    },
    fail: function (jqXHR, textStatus, errorThrown) {
      console.log("Could not get posts, server response: " + textStatus + ": " + errorThrown);
    },
  }).responseJSON;
  console.log(validPhoneFormat)
  return {
    valid: (validPhoneFormat.valid) ? true : false,
    message: (validPhoneFormat.valid) ? "" : "This field must have a valid phone number"
  }
}
function validEmailfunction(value) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be a valid email address"
  }
}


//Functions below should be updated --START--
function validIdNumFunction(value, length, distinctLength) {
  var arr = $.unique(value.split(""));
  var distinctDigLength = arr.length;
  var first3Num = value.substring(0, 3).match(/^[0-9]+$/);

  if (
    value.length == length &&
    distinctDigLength >= distinctLength &&
    first3Num != null
  ) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function distinctNumberFunction(value) {
  var arr = $.unique(value.split(""));
  var distinctDigLength = arr.length;

  if (distinctDigLength >= 3) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function uidNumberFunction(value, lengthMin, lengthMax) {
  var arr = $.unique(value.split(""));
  var distinctDigLength = arr.length;
  var allNum = value.match(/^[0-9]+$/);

  if (
    value.length >= lengthMin &&
    value.length <= lengthMax &&
    distinctDigLength >= 3 &&
    allNum != null
  ) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function UAEnumFormatfunction(value) {
  const validPhoneFormat = $.ajax({
    type: "GET",
    url: "http://apilayer.net/api/validate",
    dataType: "json",
    data: { access_key: "386661ddd43191ec181a736418ab4702", number: value },
    async: false,
    done: function (results) {
      JSON.parse(results);
      return results;
    },
    fail: function (jqXHR, textStatus, errorThrown) {
      console.log(
        "Could not get posts, server response: " +
        textStatus +
        ": " +
        errorThrown
      );
    },
  }).responseJSON;
  if (validPhoneFormat.valid == true && validPhoneFormat.country_code == "AE") {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: " must have a valid UAE phone number, ",
    };
  }
}
