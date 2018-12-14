{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "target_name": "file_sender",
      "sources": [ "file_sender.cpp" ]
    }
  ]
}