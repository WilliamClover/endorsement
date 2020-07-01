//HOT Validations Function --START--
function minLengthfunction(value, length) {
  if (String(value).length < length) {
    return {
      validation: false,
      message: "must be at least " + length + " characters, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function notEmptyfunction(value) {
  if (!value || String(value).length === 0) {
    return {
      validation: false,
      message: "must not be empty, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function validEmailfunction(value) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  if (value && regex.test(value) === false) {
    return {
      validation: false,
      message: "must be a valid email address, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function lettersAndSpacesfunction(value) {
  var regex = /^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/;
  if (!value || regex.test(value) === false) {
    return {
      validation: false,
      message: "must be only alphabets, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function alphaNumericfunction(value) {
  var regex = /^[a-zA-Z0-9_]+$/;
  if (!value || regex.test(value) === false) {
    return {
      validation: false,
      message: "must be only alphanumeric, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function checkPhoneNumberfunction(value) {
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
  if (validPhoneFormat.valid == false) {
    return {
      validation: false,
      message: " must have a valid phone number, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
function validateDatefunction(value) {
  if (isNaN(value)) {
    return {
      validation: false,
      message: "must have a valid date, ",
    };
  } else {
    return {
      validation: true,
      message: "",
    };
  }
}
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
