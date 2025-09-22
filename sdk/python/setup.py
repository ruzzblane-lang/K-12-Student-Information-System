from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="school-sis-sdk",
    version="1.0.0",
    author="School SIS Team",
    author_email="team@schoolsis.com",
    description="Official Python SDK for K-12 Student Information System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/school-sis/sdk-python",
    project_urls={
        "Bug Tracker": "https://github.com/school-sis/sdk-python/issues",
        "Documentation": "https://github.com/school-sis/sdk-python#readme",
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Intended Audience :: Education",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Education",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
        "pydantic>=1.8.0",
        "typing-extensions>=3.7.4",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0.0",
            "pytest-asyncio>=0.15.0",
            "black>=21.0.0",
            "flake8>=3.8.0",
            "mypy>=0.800",
        ],
        "async": [
            "aiohttp>=3.7.0",
            "asyncio>=3.4.3",
        ],
    },
    keywords=[
        "school",
        "education",
        "sis",
        "student-information-system",
        "api",
        "sdk",
        "python",
    ],
)
