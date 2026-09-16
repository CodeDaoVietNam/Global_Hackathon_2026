from app.services.privacy import scan_submission


def test_clean_submission_passes():
    report = scan_submission({
        "cue": "can lah",
        "scenario": "A classmate said this during project discussion.",
        "interpretation": "It expresses reassurance or consent.",
    })
    assert report.safe is True
    assert len(report.flags) == 0


def test_detects_email_and_does_not_echo_secret():
    secret_email = "student123@u.nus.edu"
    report = scan_submission({"scenario": f"Contact me at {secret_email} for notes."})
    assert report.safe is False
    assert any(flag.code == "contains_email" for flag in report.flags)
    for flag in report.flags:
        assert secret_email not in flag.remediation


def test_detects_phone_numbers():
    report = scan_submission({"text": "Call me at +65 9123 4567 or 81234567"})
    assert report.safe is False
    assert any(flag.code == "contains_phone" for flag in report.flags)


def test_detects_student_id():
    report = scan_submission({"text": "My student id: A0123456X from school."})
    assert report.safe is False
    assert any(flag.code == "contains_student_id" for flag in report.flags)


def test_detects_private_url_token():
    report = scan_submission({"url": "https://example.com/doc?token=secret12345&auth=true"})
    assert report.safe is False
    assert any(flag.code == "contains_private_url" for flag in report.flags)


def test_detects_labelled_name():
    report = scan_submission({"context": "Name: John Tan arrived late and said bojio."})
    assert report.safe is False
    assert any(flag.code == "contains_labelled_name" for flag in report.flags)


def test_detects_long_chat_paste():
    long_chat = "A: Hello\nB: Hi\n" * 10
    report = scan_submission({"chat": long_chat})
    assert report.safe is False
    assert any(flag.code == "long_chat_paste" for flag in report.flags)
