void main() {
  samsungB samsung = samsungB();
  samsung.call();
  samsung.message();
}

class samsungA {
  static String color = "red";

  void call() {
    print("Calling");
  }

  void message() {
    print("Messaging");
  }
}

class samsungB extends samsungA {
  void captureImg() {
    print("Capturing");
  }

  @override
  void message() {
    print("messaging from samsungB");
  }
}
